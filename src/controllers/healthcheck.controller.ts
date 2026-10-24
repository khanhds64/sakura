import { Request, Response } from "express";
import { pool } from "../config/database";

export function checkHealth(_req: Request, res: Response): void {
    res.json({ status: "ok" });
}

export async function checkDbHealth(
    _req: Request,
    res: Response
): Promise<void> {
    try {
        const result = await pool.query("SELECT NOW() AS now");
        res.json({ status: "ok", databaseTime: result.rows[0].now });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: "error" });
    }
}