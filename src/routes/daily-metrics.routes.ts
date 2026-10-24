import { Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware";
import { requireAdmin } from "../middleware/requireAdmin";
import {
    getDailyMetrics,
    createDailyMetric,
    getDailyMetricById,
    updateDailyMetric,
} from "../controllers/daily-metrics.controller";
import { validateOrigin } from "../middleware/validateOrigin";

const router = Router();

router.get(
    "/",
    authenticateToken,
    requireAdmin,
    getDailyMetrics
);

router.post(
    "/",
    validateOrigin,
    authenticateToken,
    requireAdmin,
    createDailyMetric
);

router.get(
    "/:id",
    authenticateToken,
    requireAdmin,
    getDailyMetricById
);

router.put(
    "/:id",
    validateOrigin,
    authenticateToken,
    requireAdmin,
    updateDailyMetric
);

export default router;