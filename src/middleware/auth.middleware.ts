import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export function authenticateToken(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    const token = req.cookies?.accessToken;

    if (!token || typeof token !== "string") {
        res.status(401).json({
            message: "Authentication required",
        });
        return;
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
        console.error("JWT_SECRET is not configured");

        res.status(500).json({
            message: "Internal server error",
        });
        return;
    }

    try {
        const decoded = jwt.verify(token, secret);

        if (
            typeof decoded === "string" ||
            typeof decoded.sub !== "string" ||
            typeof decoded.role !== "string"
        ) {
            res.status(401).json({
                message: "Invalid authentication token",
            });
            return;
        }

        req.auth = {
            userId: decoded.sub,
            role: decoded.role,
        };

        next();
    } catch {
        res.status(401).json({
            message: "Invalid or expired authentication token",
        });
    }
}
