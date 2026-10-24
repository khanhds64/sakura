import express from "express";
import dashboardRoutes from "./routes/dashboard.routes";
import swaggerUi from "swagger-ui-express";
import { openapiSpecification } from "./config/swagger";
import authRoutes from "./routes/auth.routes";
import dailyMetricsRoutes from "./routes/daily-metrics.routes";
import cors from "cors";
import cookieParser from "cookie-parser";
import healthRoutes from "./routes/healthcheck.routes";

const app = express();

const allowedOrigin =
    process.env.FRONTEND_URL || "http://localhost:3000";

app.use(
    cors({
        origin: allowedOrigin,
        credentials: true,
    })
);

app.use(express.json());
app.use(cookieParser());

app.use("/api/health", healthRoutes);

app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(openapiSpecification)
);

app.get("/openapi.json", (_req, res) => {
    res.json(openapiSpecification);
});

app.use("/auth", authRoutes);

app.use("/admin/daily-metrics", dailyMetricsRoutes);

app.use("/dashboard", dashboardRoutes);

export default app;