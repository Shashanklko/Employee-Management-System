import express from "express";
import {
  getSystemDashboard,
  getAllUsers,
  getUserById,
  updateAnyUser,
  deleteAnyUser,
  blockAnyUser,
  unblockAnyUser,
  getAllSystemMessages,
  deleteAnyMessage,
  getAllSystemReports,
  updateAnyReport,
  deleteAnyReport,
  getAllPayrollData,
  bulkUpdateSalaries,
  createSystemAdmin,
  getAllSystemAdmins,
  getSystemConfig,
} from "../controllers/adminController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { requireSystemAdmin } from "../middleware/roleMiddleware.js";

const router = express.Router();

// All routes require System Admin authentication
router.use(authenticate);
router.use(requireSystemAdmin);

// ============================================
// DASHBOARD & STATISTICS
// ============================================
router.get("/dashboard", getSystemDashboard);
router.get("/config", getSystemConfig);

// ============================================
// USER MANAGEMENT (All Types)
// ============================================
router.get("/users", getAllUsers); // Get all users (employees, HR, executives)
router.get("/users/:id", getUserById); // Get any user by ID
router.put("/users/:id", updateAnyUser); // Update any user
router.delete("/users/:id", deleteAnyUser); // Delete/deactivate any user

// Block/Unblock any user
router.post("/users/:id/block", blockAnyUser);
router.post("/users/:id/unblock", unblockAnyUser);

// ============================================
// SYSTEM ADMIN MANAGEMENT
// ============================================
router.get("/admins", getAllSystemAdmins); // Get all System Admins
router.post("/admins", createSystemAdmin); // Create new System Admin

// ============================================
// MESSAGES MANAGEMENT
// ============================================
router.get("/messages", getAllSystemMessages); // Get all messages in system
router.delete("/messages/:id", deleteAnyMessage); // Delete any message

// ============================================
// REPORTS MANAGEMENT
// ============================================
router.get("/reports", getAllSystemReports); // Get all reports
router.put("/reports/:id", updateAnyReport); // Update any report
router.delete("/reports/:id", deleteAnyReport); // Delete any report

// ============================================
// PAYROLL MANAGEMENT
// ============================================
router.get("/payroll", getAllPayrollData); // Get comprehensive payroll data
router.post("/payroll/bulk-update", bulkUpdateSalaries); // Bulk update salaries

export default router;

