
import type { Request, Response } from "express";
import { pool } from "../config/database";
import { DateTime } from "luxon";
import { VIETNAM_ZONE } from "../utils/date.utils";
import { DashboardSummary, MessageResponse } from "../types/generated-api";


export async function getDashboardSummary(
    _req: Request,
    res: Response<DashboardSummary | MessageResponse>
): Promise<void> {
    const today = DateTime.now().setZone(VIETNAM_ZONE);
    const thisWeekStart = today.startOf("week").toISODate();
    const todayDate = today.toISODate();
    const lastWeekStart = today.minus({ weeks: 1 }).startOf("week").toISODate();
    const lastWeekEnd = today.startOf("week").minus({ days: 1 }).toISODate();

    if (!thisWeekStart || !todayDate || !lastWeekStart || !lastWeekEnd) {
        res.status(500).json({
            message: "Failed to calculate the date range",
        });
        return;
    }

    try {
        const result = await pool.query(
            `SELECT
                COALESCE(SUM(
                    CASE WHEN metric_date BETWEEN $1 AND $2
                    THEN COALESCE(pos_revenue, 0) + COALESCE(eatclub_revenue, 0)
                    ELSE 0 END
                ), 0) AS "thisWeekTotalRevenue",

                COALESCE(SUM(
                    CASE WHEN metric_date BETWEEN $3 AND $4
                    THEN COALESCE(pos_revenue, 0) + COALESCE(eatclub_revenue, 0)
                    ELSE 0 END
                ), 0) AS "lastWeekTotalRevenue",

                COALESCE(SUM(
                    CASE WHEN metric_date BETWEEN $1 AND $2
                    THEN COALESCE(covers, 0)
                    ELSE 0 END
                ), 0) AS "thisWeekTotalCovers",

                COALESCE(SUM(
                    CASE WHEN metric_date BETWEEN $3 AND $4
                    THEN COALESCE(covers, 0)
                    ELSE 0 END
                ), 0) AS "lastWeekTotalCovers"
             FROM daily_metrics
             WHERE metric_date BETWEEN $3 AND $2`,
            [thisWeekStart, todayDate, lastWeekStart, lastWeekEnd]
        );

        const row = result.rows[0];

        res.status(200).json({
            thisWeek: {
                totalRevenue: Number(row.thisWeekTotalRevenue),
                averageRevenuePerDay:
                    Number(row.thisWeekTotalRevenue) / today.weekday,
                totalCovers: Number(row.thisWeekTotalCovers),
            },
            lastWeek: {
                totalRevenue: Number(row.lastWeekTotalRevenue),
                averageRevenuePerDay:
                    Number(row.lastWeekTotalRevenue) / 7,
                totalCovers: Number(row.lastWeekTotalCovers),
            },
        });
    } catch (error) {
        console.error("Failed to fetch dashboard summary:", error);

        res.status(500).json({
            message: "Failed to fetch dashboard summary",
        });
    }
}

export async function getRevenueTrend(
    req: Request,
    res: Response
): Promise<void> {
    const comparePrevious = req.query.comparePrevious === "true";

    const today = DateTime.now().setZone(VIETNAM_ZONE)
    const currentWeekStart = today.startOf("week").toISODate();
    const currentWeekEnd = today.endOf("week").toISODate();

    const lastWeekStart = today.startOf("week").minus({ weeks: 1 }).toISODate();
    const lastWeekEnd = today.startOf("week").minus({ days: 1 }).toISODate();

    if (
        !currentWeekStart ||
        !currentWeekEnd ||
        !lastWeekStart ||
        !lastWeekEnd
    ) {
        res.status(500).json({
            message: "Failed to calculate the date range",
        });
        return;
    }

    try {
        const result = await pool.query(
            `WITH date_ranges AS (
                SELECT generate_series(
                    $1::date,
                    $2::date,
                    INTERVAL '1 day'
                )::date AS metric_date
            )
            SELECT
                TO_CHAR(d.metric_date, 'YYYY-MM-DD') AS "metricDate",
                COALESCE(m.pos_revenue, 0) AS "posRevenue",
                COALESCE(m.eatclub_revenue, 0) AS "eatclubRevenue",
                COALESCE(m.labour_costs, 0) AS "labourCosts"
            FROM date_ranges d
            LEFT JOIN daily_metrics m
                ON m.metric_date = d.metric_date
            ORDER BY d.metric_date ASC`,
            [
                comparePrevious ? lastWeekStart : currentWeekStart,
                comparePrevious ? lastWeekEnd : currentWeekEnd,
            ]
        );

        const mapRevenue = (row: (typeof result.rows)[number]) => ({
            ...row,
            posRevenue: Number(row.posRevenue),
            eatclubRevenue: Number(row.eatclubRevenue),
            labourCosts: Number(row.labourCosts),
        });

        const currentWeek = comparePrevious
            ? []
            : result.rows.map(mapRevenue);

        if (!comparePrevious) {
            res.status(200).json({ currentWeek });
            return;
        }

        // Fetch both weeks when comparison is enabled.
        const comparisonResult = await pool.query(
            `WITH date_ranges AS (
                SELECT generate_series(
                    $1::date,
                    $2::date,
                    INTERVAL '1 day'
                )::date AS metric_date
            )
            SELECT
                TO_CHAR(d.metric_date, 'YYYY-MM-DD') AS "metricDate",
                COALESCE(m.pos_revenue, 0) AS "posRevenue",
                COALESCE(m.eatclub_revenue, 0) AS "eatclubRevenue",
                COALESCE(m.labour_costs, 0) AS "labourCosts"
            FROM date_ranges d
            LEFT JOIN daily_metrics m
                ON m.metric_date = d.metric_date
            ORDER BY d.metric_date ASC`,
            [lastWeekStart, currentWeekEnd]
        );

        const rows = comparisonResult.rows.map(mapRevenue);

        res.status(200).json({
            currentWeek: rows.filter(
                (row) => row.metricDate >= currentWeekStart
            ),
            lastWeek: rows.filter(
                (row) => row.metricDate < currentWeekStart
            ),
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch revenue trend",
        });
    }
}

