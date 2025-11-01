import express from "express";
import {
  checkIn,
  checkOut,
  getAttendance,
  getAttendanceStats,
  updateAttendance,
} from "../controllers/attendanceController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { requireHR } from "../middleware/roleMiddleware.js";
import { checkBlockedStatus } from "../middleware/blockCheckMiddleware.js";

const router = express.Router();

// All routes require authentication and check blocked status
router.use(authenticate);
router.use(checkBlockedStatus);

// Check in (all authenticated users)
router.post("/check-in", checkIn);

// Check out (all authenticated users)
router.post("/check-out", checkOut);

// Get attendance records
router.get("/", getAttendance);

// Get attendance statistics
router.get("/stats", getAttendanceStats);

// Update attendance manually (HR/Executive/System Admin only)
router.put("/:id", requireHR, updateAttendance);

export default router;

