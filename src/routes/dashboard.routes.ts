import { Router } from "express";
import {
    getDashboardRevenueTrend,
    getDashboardSummary,
} from "../controllers/dashboard.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();

router.get("/summary", authenticateToken, getDashboardSummary);
router.get("/revenue-trend", authenticateToken, getDashboardRevenueTrend);


export default router;