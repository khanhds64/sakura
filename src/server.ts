
import app from "./app";
import { pool } from "./config/database";

const PORT = Number(process.env.PORT) || 8080;

const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});

let shuttingDown = false;

function shutdown(signal: string) {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log(`${signal} received. Shutting down...`);

    server.close(async (error) => {
        if (error) {
            console.error("Error closing HTTP server:", error);
            process.exitCode = 1;
        }

        try {
            await pool.end();
            console.log("Database pool closed.");
        } catch (err) {
            console.error("Error closing database pool:", err);
            process.exitCode = 1;
        }
    });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
