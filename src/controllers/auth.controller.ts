
import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import { pool } from "../config/database";
import jwt, { type SignOptions } from "jsonwebtoken";

const expiresIn = (process.env.JWT_EXPIRES_IN || "3d") as SignOptions["expiresIn"];

export async function login(req: Request, res: Response) {
    try {
        const { email, password } = req.body;

        if (
            typeof email !== "string" ||
            typeof password !== "string" ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                message: "Email and password are required",
            });
        }

        const result = await pool.query(
            `SELECT id, email, password, role
             FROM users
             WHERE email = $1`,
            [email.trim()]
        );

        const user = result.rows[0];

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({
                message: "Invalid email or password",
            });
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

        return res.status(200).json({
            email: user.email,
            role: user.role,
        });
    } catch (error) {
        console.error("Login error:", error);

        return res.status(500).json({
            message: "Internal server error",
        });
    }
}

export function logout(_req: Request, res: Response): void {
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
