import type { Request, Response, NextFunction } from "express";

const stateChangingMethods = new Set([
    "POST",
    "PUT",
    "DELETE",
]);

export function validateOrigin(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    if (!stateChangingMethods.has(req.method)) {
        next();
        return;
    }

    const allowedOrigin = process.env.FRONTEND_URL;
    const origin = req.get("Origin");

    if (!allowedOrigin) {
        console.error("FRONTEND_URL is not configured");
        res.status(500).json({
            message: "Internal server error",
        });
        return;
    }

    if (!origin || origin !== allowedOrigin) {
        res.status(403).json({
            message: "Origin not allowed",
        });
        return;
    }

    next();
}
