import express from "express";
import {
  logTimesheet,
  getTimesheets,
  approveTimesheet,
  rejectTimesheet,
  updateTimesheet,
  deleteTimesheet,
} from "../controllers/timesheetController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { requireHR } from "../middleware/roleMiddleware.js";
import { checkBlockedStatus } from "../middleware/blockCheckMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);
router.use(checkBlockedStatus);

// Log timesheet entry (all authenticated users)
router.post("/", logTimesheet);

// Get timesheet entries
router.get("/", getTimesheets);

// Update timesheet (owner or admin)
router.put("/:id", updateTimesheet);

// Approve timesheet (HR/Executive/System Admin only)
router.post("/:id/approve", requireHR, approveTimesheet);

// Reject timesheet (HR/Executive/System Admin only)
router.post("/:id/reject", requireHR, rejectTimesheet);

// Delete timesheet (owner or admin)
router.delete("/:id", deleteTimesheet);

export default router;

