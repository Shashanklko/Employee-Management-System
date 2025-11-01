import express from "express";
import {
  applyLeave,
  getLeaves,
  getLeaveById,
  approveLeave,
  rejectLeave,
  cancelLeave,
} from "../controllers/leaveController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { requireHR } from "../middleware/roleMiddleware.js";
import { checkBlockedStatus } from "../middleware/blockCheckMiddleware.js";

const router = express.Router();

// All routes require authentication and check blocked status
router.use(authenticate);
router.use(checkBlockedStatus);

// Apply for leave (all authenticated users)
router.post("/", applyLeave);

// Get leave applications
router.get("/", getLeaves);

// Get leave by ID
router.get("/:id", getLeaveById);

// Approve leave (HR/Executive/System Admin only)
router.post("/:id/approve", requireHR, approveLeave);

// Reject leave (HR/Executive/System Admin only)
router.post("/:id/reject", requireHR, rejectLeave);

// Cancel leave (employee only - their own leaves)
router.post("/:id/cancel", cancelLeave);

export default router;

