import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { getStats, getNeglected, getSuggestions } from "../controllers/analyticsController.js";

const router = express.Router();

router.use(requireAuth);

router.get("/stats", getStats);
router.get("/neglected", getNeglected);
router.get("/suggestions", getSuggestions);

export default router;
