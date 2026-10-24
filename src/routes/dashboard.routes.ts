import { Router } from "express";
import {
    getDashboardSummary,
    getRevenueTrend,
} from "../controllers/dashboard.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();

router.get("/summary", authenticateToken, getDashboardSummary);
router.get("/revenue-trend", authenticateToken, getRevenueTrend);


export default router;