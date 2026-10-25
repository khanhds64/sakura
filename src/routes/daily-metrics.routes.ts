import { Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware";
import { requireAdmin } from "../middleware/requireAdmin";
import {
    createDailyMetric,
    getDailyMetricById,
    getDailyMetricList,
    updateDailyMetric,
} from "../controllers/daily-metrics.controller";
import { validateOrigin } from "../middleware/validateOrigin";

const router = Router();

router.get(
    "/",
    authenticateToken,
    requireAdmin,
    getDailyMetricList
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