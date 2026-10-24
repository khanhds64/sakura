import { Router } from "express";
import { checkDbHealth, checkHealth } from "../controllers/healthcheck.controller";


const router = Router();

router.get("/", checkHealth);
router.get("/db", checkDbHealth);

export default router;