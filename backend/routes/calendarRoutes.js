import express from "express";
import {
  getMonthlyCalendar,
  getLeaveBalance,
} from "../controllers/calendarController.js";
import { updateLeaveAllocation } from "../controllers/leaveBalanceController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { requireHR } from "../middleware/roleMiddleware.js";
import { checkBlockedStatus } from "../middleware/blockCheckMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);
router.use(checkBlockedStatus);

// Get monthly calendar with attendance analytics
router.get("/monthly", getMonthlyCalendar);

// Get leave balance by category
router.get("/leave-balance", getLeaveBalance);

// Update leave allocation (HR/Executive/System Admin only)
router.put("/leave-allocation", requireHR, updateLeaveAllocation);

export default router;

