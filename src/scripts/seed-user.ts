
import "dotenv/config";
import bcrypt from "bcrypt";
import { pool } from "../config/database";

async function seedAdmin() {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
        throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
        `INSERT INTO users (email, password, role)
         VALUES ($1, $2, 'admin')
         ON CONFLICT (email) DO NOTHING
         RETURNING id, email, role`,
        [email, passwordHash]
    );

    if (result.rowCount === 0) {
        console.log("Admin account already exists.");
    } else {
        console.log("Admin account created:", result.rows[0]);
    }
}

async function seedStaff() {
    const email = process.env.STAFF_EMAIL;
    const password = process.env.STAFF_PASSWORD;

    if (!email || !password) {
        throw new Error("STAFF_EMAIL and STAFF_PASSWORD must be set");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
        `INSERT INTO users (email, password, role)
         VALUES ($1, $2, 'staff')
         ON CONFLICT (email) DO NOTHING
         RETURNING id, email, role`,
        [email, passwordHash]
    );

    if (result.rowCount === 0) {
        console.log("Staff account already exists.");
    } else {
        console.log("Staff account created:", result.rows[0]);
    }
}


async function seedUsers() {
    try {
        await seedAdmin();
        await seedStaff();
    } catch (error) {
        console.error("Failed to seed users:", error);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

seedUsers();
