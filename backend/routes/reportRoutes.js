import express from "express";
import {
  getAllReports,
  getMyReports,
  getReportById,
  createReport,
  updateReport,
  deleteReport,
} from "../controllers/reportController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { requireHR } from "../middleware/roleMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all reports (HR/Executive/System Admin only)
router.get("/all", requireHR, getAllReports);

// Get my reports
router.get("/", getMyReports);

// Get report by ID
router.get("/:id", getReportById);

// Create report
router.post("/", createReport);

// Update report (HR/Executive/System Admin only)
router.put("/:id", requireHR, updateReport);

// Delete report
router.delete("/:id", deleteReport);

export default router;

