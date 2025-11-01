import express from "express";
import {
  getAllHolidays,
  getHolidayById,
  createHoliday,
  updateHoliday,
  deleteHoliday,
} from "../controllers/holidayController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { requireHR } from "../middleware/roleMiddleware.js";
import { checkBlockedStatus } from "../middleware/blockCheckMiddleware.js";

const router = express.Router();

// All routes require authentication and check blocked status
router.use(authenticate);
router.use(checkBlockedStatus);

// Get all holidays (all authenticated users can view)
router.get("/", getAllHolidays);

// Get holiday by ID (all authenticated users can view)
router.get("/:id", getHolidayById);

// Create holiday (System Admin, Executive, HR only)
router.post("/", requireHR, createHoliday);

// Update holiday (System Admin, Executive, HR only)
router.put("/:id", requireHR, updateHoliday);

// Delete holiday (System Admin, Executive, HR only)
router.delete("/:id", requireHR, deleteHoliday);

export default router;

