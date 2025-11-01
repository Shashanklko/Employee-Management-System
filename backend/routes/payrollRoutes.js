import express from "express";
import {
  getAllPayrolls,
  getEmployeePayroll,
  updatePayroll,
  processPayroll,
} from "../controllers/payrollController.js";
import { generateSalarySlip } from "../controllers/salarySlipController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { requireHR } from "../middleware/roleMiddleware.js";
import { checkBlockedStatus } from "../middleware/blockCheckMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);
router.use(checkBlockedStatus);

// Get all payrolls (HR/Executive/System Admin only)
router.get("/", requireHR, getAllPayrolls);

// Process payroll for all employees (HR/System Admin only)
router.post("/process", requireHR, processPayroll);

// Get payroll for specific employee
router.get("/employee/:employee_id", getEmployeePayroll);

// Update employee payroll (HR/System Admin only)
router.put("/employee/:employee_id", requireHR, updatePayroll);

// Generate salary slip (all authenticated users can view own, HR/Executive/System Admin can view any)
router.get("/salary-slip", generateSalarySlip);

export default router;
