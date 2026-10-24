
import type { Request, Response, NextFunction } from "express";

export function requireAdmin(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    if (!req.auth) {
        res.status(401).json({
            message: "Authentication required",
        });
        return;
    }

    if (req.auth.role !== "admin") {
        res.status(403).json({
            message: "Admin access required",
        });
        return;
    }

    next();
}
