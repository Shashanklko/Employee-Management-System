import express from "express";
import {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  blockEmployee,
  unblockEmployee,
  getEmployeeStats,
} from "../controllers/employeeController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { requireHR, requireSystemAdmin } from "../middleware/roleMiddleware.js";
import { checkBlockedStatus } from "../middleware/blockCheckMiddleware.js";

const router = express.Router();

// All routes require authentication and check blocked status
router.use(authenticate);
router.use(checkBlockedStatus);

// Get employee statistics (HR/Executive/System Admin only)
router.get("/stats", requireHR, getEmployeeStats);

// Get all employees (HR/Executive/System Admin only)
router.get("/", requireHR, getAllEmployees);

// Get employee by ID
router.get("/:id", getEmployeeById);

// Create employee (HR/System Admin only)
router.post("/", requireHR, createEmployee);

// Update employee
router.put("/:id", updateEmployee);

// Block employee (HR/Executive/System Admin only) - Can do it themselves, no System Admin needed
router.post("/:id/block", requireHR, blockEmployee);

// Unblock employee (HR/Executive/System Admin only)
router.post("/:id/unblock", requireHR, unblockEmployee);

// Delete employee (System Admin only)
router.delete("/:id", requireSystemAdmin, deleteEmployee);

export default router;

