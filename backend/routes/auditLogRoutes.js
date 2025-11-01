import express from "express";
import {
  getAllAuditLogs,
  getAuditLogSummary,
  getAuditLogById,
  getEntityAuditLogs,
} from "../controllers/auditLogController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { requireSystemAdmin, requireExecutive } from "../middleware/roleMiddleware.js";
import { checkBlockedStatus } from "../middleware/blockCheckMiddleware.js";

const router = express.Router();

// All routes require authentication and check blocked status
router.use(authenticate);
router.use(checkBlockedStatus);

// Get audit log summary (System Admin - view summary)
router.get("/summary", requireSystemAdmin, getAuditLogSummary);

// Get all audit logs (System Admin only)
router.get("/", requireSystemAdmin, getAllAuditLogs);

// Get audit logs for specific entity (System Admin, Executive - view summary)
router.get("/entity", requireExecutive, getEntityAuditLogs);

// Get audit log by ID (System Admin only)
router.get("/:id", requireSystemAdmin, getAuditLogById);

export default router;

