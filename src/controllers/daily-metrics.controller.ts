import type { Request, Response } from "express";
import { pool } from "../config/database";
import { DATE_FORMAT_YYYYMMDD_HYPHEN, isValidDate, VIETNAM_ZONE } from "../utils/date.utils";
import { DateTime } from "luxon";
import { DailyMetricItem, DailyMetricList, DailyMetricListQuery, DailyMetricRequest, MessageResponse } from "../types/generated-api";

type DailyMetricListQueryRequest =
    Omit<DailyMetricListQuery, "currentPage" | "itemsPerPage"> & {
        currentPage?: string;
        itemsPerPage?: string;
    };

export async function getDailyMetricList(
    req: Request<{}, {}, {}, DailyMetricListQueryRequest>,
    res: Response<DailyMetricList | MessageResponse>
): Promise<void> {
    try {
        const { startDate, endDate } = req.query;

        // Validate date query parameters.
        if (
            (startDate !== undefined && typeof startDate !== "string") ||
            (endDate !== undefined && typeof endDate !== "string")
        ) {
            res.status(400).json({
                message: "startDate and endDate must be single date values",
            });
            return;
        }

        if (
            (startDate !== undefined && !isValidDate(startDate)) ||
            (endDate !== undefined && !isValidDate(endDate))
        ) {
            res.status(400).json({
                message: "Dates must be valid yyyy-MM-dd values",
            });
            return;
        }

        // Default to page 1 and 10 items per page.
        const currentPageParam = req.query.currentPage ?? "1";
        const itemsPerPageParam = req.query.itemsPerPage ?? "10";

        if (
            typeof currentPageParam !== "string" ||
            typeof itemsPerPageParam !== "string" ||
            !/^[1-9]\d*$/.test(currentPageParam) ||
            !/^[1-9]\d*$/.test(itemsPerPageParam)
        ) {
            res.status(400).json({
                message: "currentPage and itemsPerPage must be positive integers",
            });
            return;
        }

        const currentPage = Number(currentPageParam);
        const itemsPerPage = Number(itemsPerPageParam);

        if (
            !Number.isSafeInteger(currentPage) ||
            !Number.isSafeInteger(itemsPerPage) ||
            itemsPerPage > 50
        ) {
            res.status(400).json({
                message: "currentPage must be a safe positive integer and itemsPerPage must be between 1 and 50",
            });
            return;
        }

        // Build shared filters for both SQL queries.
        const conditions: string[] = [];
        const values: string[] = [];
        const today = DateTime.now().setZone(VIETNAM_ZONE).toFormat(DATE_FORMAT_YYYYMMDD_HYPHEN);

        if (startDate !== undefined) {
            conditions.push(`metric_date >= $${values.length + 1}`);
            values.push(startDate);
        }

        const effectiveEndDate =
            endDate ?? (startDate !== undefined ? today : undefined);

        if (effectiveEndDate !== undefined) {
            conditions.push(`metric_date <= $${values.length + 1}`);
            values.push(effectiveEndDate);
        }

        if (
            startDate !== undefined &&
            effectiveEndDate !== undefined &&
            startDate > effectiveEndDate
        ) {
            res.status(400).json({
                message: "startDate must be on or before endDate",
            });
            return;
        }

        const whereClause = conditions.length
            ? `WHERE ${conditions.join(" AND ")}`
            : "";

        // Count all matching records before pagination.
        const countResult = await pool.query(
            `SELECT COUNT(*) AS "totalItems"
             FROM daily_metrics
             ${whereClause}`,
            values
        );

        const totalItems = Number(countResult.rows[0].totalItems);
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        const offset = (currentPage - 1) * itemsPerPage;

        // Fetch only the requested page.
        const dataResult = await pool.query(
            `SELECT
                id,
                TO_CHAR(metric_date, 'YYYY-MM-DD') AS "metricDate",
                pos_revenue AS "posRevenue",
                eatclub_revenue AS "eatclubRevenue",
                labour_costs AS "labourCosts",
                covers
             FROM daily_metrics
             ${whereClause}
             ORDER BY metric_date DESC
             LIMIT $${values.length + 1}
             OFFSET $${values.length + 2}`,
            [...values, itemsPerPage, offset]
        );

        const data = dataResult.rows.map((row) => ({
            ...row,
            posRevenue: Number(row.posRevenue),
            eatclubRevenue: Number(row.eatclubRevenue),
            labourCosts: Number(row.labourCosts),
        }));

        res.status(200).json({
            data: data,
            totalItems,
            currentPage,
            itemsPerPage,
            totalPages,
        });
    } catch (error) {
        console.error("Failed to fetch daily metrics:", error);

        res.status(500).json({
            message: "Internal server error",
        });
    }
}

export async function createDailyMetric(
    req: Request<{}, {}, DailyMetricRequest>,
    res: Response<MessageResponse>
): Promise<void> {

    try {
        const {
            metricDate,
            posRevenue,
            eatclubRevenue,
            labourCosts,
            covers,
        } = req.body;

        if (
            typeof metricDate !== "string" ||
            posRevenue === undefined ||
            eatclubRevenue === undefined ||
            labourCosts === undefined ||
            covers === undefined
        ) {
            res.status(400).json({
                message: "All fields are required",
            });
            return;
        }

        if (!isValidDate(metricDate)) {
            res.status(400).json({
                message: "metricDate must be a valid YYYY-MM-DD date",
            });
            return;
        }

        if (
            typeof posRevenue !== "number" ||
            !Number.isFinite(posRevenue) ||
            posRevenue < 0 ||
            typeof eatclubRevenue !== "number" ||
            !Number.isFinite(eatclubRevenue) ||
            eatclubRevenue < 0 ||
            typeof labourCosts !== "number" ||
            !Number.isFinite(labourCosts) ||
            labourCosts < 0 ||
            !Number.isInteger(covers) ||
            covers < 0
        ) {
            res.status(400).json({
                message:
                    "Revenue values must be non-negative numbers, and covers must be a non-negative integer",
            });
            return;
        }

        const result = await pool.query(
            `INSERT INTO daily_metrics (
                metric_date,
                pos_revenue,
                eatclub_revenue,
                labour_costs,
                covers,
                created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING
                id,
                TO_CHAR(metric_date, 'YYYY-MM-DD') AS "metricDate",
                pos_revenue AS "posRevenue",
                eatclub_revenue AS "eatclubRevenue",
                labour_costs AS "labourCosts",
                covers`,
            [
                metricDate,
                posRevenue,
                eatclubRevenue,
                labourCosts,
                covers,
                req.auth!.userId,
            ]
        );

        const row = result.rows[0];

        res.status(201).json({
            ...row,
            posRevenue: Number(row.posRevenue),
            eatclubRevenue: Number(row.eatclubRevenue),
            labourCosts: Number(row.labourCosts),
        });
    } catch (error) {
        if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "23505"
        ) {
            res.status(409).json({
                message: "Metrics already exist for this date",
            });
            return;
        }

        console.error("Failed to create daily metric:", error);
        res.status(500).json({
            message: "Internal server error",
        });
    }

}

export async function getDailyMetricById(
    req: Request<{ id: string }>,
    res: Response<DailyMetricItem | MessageResponse>
): Promise<void> {
    try {
        const { id } = req.params;

        if (typeof id !== "string" || !/^[1-9]\d*$/.test(id)) {
            res.status(400).json({
                message: "id must be a positive integer",
            });
            return;
        }

        const result = await pool.query(
            `SELECT
                id,
                TO_CHAR(metric_date, 'YYYY-MM-DD') AS "metricDate",
                pos_revenue AS "posRevenue",
                eatclub_revenue AS "eatclubRevenue",
                labour_costs AS "labourCosts",
                covers
             FROM daily_metrics
             WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            res.status(404).json({
                message: "Daily metric not found",
            });
            return;
        }

        const row = result.rows[0];

        res.status(200).json({
            ...row,
            posRevenue: Number(row.posRevenue),
            eatclubRevenue: Number(row.eatclubRevenue),
            labourCosts: Number(row.labourCosts),
        });
    } catch (error) {
        console.error("Failed to fetch daily metric:", error);
        res.status(500).json({
            message: "Internal server error",
        });
    }
}

export async function updateDailyMetric(
    req: Request<{ id: string }, any, DailyMetricRequest>,
    res: Response<DailyMetricItem | MessageResponse>
): Promise<void> {
    try {
        const { id } = req.params;

        if (typeof id !== "string" || !/^[1-9]\d*$/.test(id)) {
            res.status(400).json({
                message: "id must be a positive integer",
            });
            return;
        }

        const {
            metricDate,
            posRevenue,
            eatclubRevenue,
            labourCosts,
            covers,
        } = req.body;

        if (
            typeof metricDate !== "string" ||
            posRevenue === undefined ||
            eatclubRevenue === undefined ||
            labourCosts === undefined ||
            covers === undefined
        ) {
            res.status(400).json({
                message: "All fields are required",
            });
            return;
        }

        if (!isValidDate(metricDate)) {
            res.status(400).json({
                message: "metricDate must be a valid YYYY-MM-DD date",
            });
            return;
        }

        if (
            typeof posRevenue !== "number" ||
            !Number.isFinite(posRevenue) ||
            posRevenue < 0 ||
            typeof eatclubRevenue !== "number" ||
            !Number.isFinite(eatclubRevenue) ||
            eatclubRevenue < 0 ||
            typeof labourCosts !== "number" ||
            !Number.isFinite(labourCosts) ||
            labourCosts < 0 ||
            !Number.isInteger(covers) ||
            covers < 0
        ) {
            res.status(400).json({
                message:
                    "Revenue values must be non-negative numbers, and covers must be a non-negative integer",
            });
            return;
        }

        const result = await pool.query(
            `UPDATE daily_metrics
             SET
                metric_date = $1,
                pos_revenue = $2,
                eatclub_revenue = $3,
                labour_costs = $4,
                covers = $5,
                updated_at = CURRENT_TIMESTAMP
             WHERE id = $6
             RETURNING
                id,
                TO_CHAR(metric_date, 'YYYY-MM-DD') AS "metricDate",
                pos_revenue AS "posRevenue",
                eatclub_revenue AS "eatclubRevenue",
                labour_costs AS "labourCosts",
                covers`,
            [
                metricDate,
                posRevenue,
                eatclubRevenue,
                labourCosts,
                covers,
                id,
            ]
        );

        if (result.rows.length === 0) {
            res.status(404).json({
                message: "Daily metric not found",
            });
            return;
        }

        const row = result.rows[0];

        res.status(200).json({
            ...row,
            posRevenue: Number(row.posRevenue),
            eatclubRevenue: Number(row.eatclubRevenue),
            labourCosts: Number(row.labourCosts),
        });
    } catch (error) {
        if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "23505"
        ) {
            res.status(409).json({
                message: "Metrics already exist for this date",
            });
            return;
        }

        console.error("Failed to update daily metric:", error);
        res.status(500).json({
            message: "Internal server error",
        });
    }
}

