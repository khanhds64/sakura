
import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import { pool } from "../config/database";
import jwt, { type SignOptions } from "jsonwebtoken";
import { LoginRequest, LoginResponse, MessageResponse } from "../types/generated-api";

const expiresIn = (process.env.JWT_EXPIRES_IN || "3d") as SignOptions["expiresIn"];

export async function login(
    req: Request<{}, {}, LoginRequest>,
    res: Response<LoginResponse | MessageResponse>
): Promise<void> {
    try {
        const { email, password } = req.body;

        if (
            typeof email !== "string" ||
            typeof password !== "string" ||
            !email.trim() ||
            !password
        ) {
            res.status(400).json({
                message: "Email and password are required",
            });
            return;
        }

        const result = await pool.query(
            `SELECT id, email, password, role
             FROM users
             WHERE email = $1`,
            [email.trim()]
        );

        const user = result.rows[0];

        if (!user || !(await bcrypt.compare(password, user.password))) {
            res.status(401).json({
                message: "Invalid email or password",
            });
            return
        }

        const secret = process.env.JWT_SECRET;

        if (!secret) {
            throw new Error("JWT_SECRET is not configured");
        }

        const token = jwt.sign(
            {
                sub: String(user.id),
                role: user.role,
            },
            secret,
            { expiresIn }
        );

        res.cookie("accessToken", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 3 * 24 * 60 * 60 * 1000, //3 days
        });

        res.status(200).json({
            email: user.email,
            role: user.role,
        });
        return;
    } catch (error) {
        console.error("Login error:", error);

        res.status(500).json({
            message: "Internal server error",
        });
    }
}

export function logout(_req: Request, res: Response<MessageResponse>): void {
    res.clearCookie("accessToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
    });

    res.status(200).json({
        message: "Logged out successfully",
    });
}
