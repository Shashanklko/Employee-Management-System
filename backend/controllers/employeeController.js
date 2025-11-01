import bcrypt from "bcrypt";
import { Op } from "sequelize";
import Employee from "../models/Employee.js";
import { sendWelcomeEmail } from "../utils/emailUtils.js";

/**
 * Get all employees (HR/Executive/System Admin only)
 */
export const getAllEmployees = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, department, is_active, is_blocked } = req.query;
    const offset = (page - 1) * limit;

    // Build where clause
    const where = {};
    if (role) where.role = role;
    if (department) where.department = department;
    if (is_active !== undefined) where.is_active = is_active === "true";
    if (is_blocked !== undefined) where.is_blocked = is_blocked === "true";

    const employees = await Employee.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["createdAt", "DESC"]],
      attributes: { exclude: ["password"] }, // Exclude password from response
    });

    res.json({
      employees: employees.rows,
      total: employees.count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(employees.count / limit),
    });
  } catch (error) {
    console.error("Get all employees error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Get employee by ID
 */
export const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await Employee.findByPk(id, {
      attributes: { exclude: ["password"] },
    });

    if (!employee) {
      return res.status(404).json({
        error: "Not found",
        message: "Employee not found",
      });
    }

    // Check if user can access this employee
    const isAdmin = ["System Admin", "HR", "Executive"].includes(req.user.role);
    const isOwner = req.user.id === parseInt(id);

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You don't have permission to view this employee",
      });
    }

    res.json({
      employee,
    });
  } catch (error) {
    console.error("Get employee by ID error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Create new employee (HR/System Admin only)
 */
export const createEmployee = async (req, res) => {
  try {
    const { full_name, email, password, role, department, current_salary, bonus } = req.body;

    // Validation
    if (!full_name || !email || !password) {
      return res.status(400).json({
        error: "Validation error",
        message: "Full name, email, and password are required",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: "Validation error",
        message: "Invalid email format",
      });
    }

    // Check if email already exists
    const existingEmployee = await Employee.findOne({ where: { email } });
    if (existingEmployee) {
      return res.status(409).json({
        error: "Conflict",
        message: "Employee with this email already exists",
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create employee
    const employee = await Employee.create({
      full_name,
      email,
      password: hashedPassword,
      role: role || "Employee",
      department,
      current_salary: current_salary || 0,
      bonus: bonus || 0,
      is_active: true,
    });

    // Send welcome email
    try {
      await sendWelcomeEmail(email, full_name, password);
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
    }

    const { password: _, ...employeeResponse } = employee.toJSON();

    res.status(201).json({
      message: "Employee created successfully",
      employee: employeeResponse,
    });
  } catch (error) {
    console.error("Create employee error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Update employee (HR/System Admin or self)
 */
export const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, role, department, current_salary, bonus, is_active } = req.body;

    const employee = await Employee.findByPk(id);
    if (!employee) {
      return res.status(404).json({
        error: "Not found",
        message: "Employee not found",
      });
    }

    // Check permissions
    const isAdmin = ["System Admin", "HR", "Executive"].includes(req.user.role);
    const isOwner = req.user.id === parseInt(id);

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You don't have permission to update this employee",
      });
    }

    // Only System Admin can change role to System Admin
    if (role === "System Admin" && req.user.role !== "System Admin") {
      return res.status(403).json({
        error: "Forbidden",
        message: "Only System Admin can assign System Admin role",
      });
    }

    // Only admins can change sensitive fields
    if (isAdmin) {
      if (full_name !== undefined) employee.full_name = full_name;
      if (role !== undefined) employee.role = role;
      if (department !== undefined) employee.department = department;
      if (current_salary !== undefined) employee.current_salary = current_salary;
      if (bonus !== undefined) employee.bonus = bonus;
      if (is_active !== undefined) employee.is_active = is_active;
    } else {
      // Self can only update certain fields
      if (full_name !== undefined) employee.full_name = full_name;
      if (department !== undefined) employee.department = department;
    }

    // Check if email is being changed
    if (email && email !== employee.email) {
      const existingEmployee = await Employee.findOne({ where: { email } });
      if (existingEmployee) {
        return res.status(409).json({
          error: "Conflict",
          message: "Email already in use",
        });
      }
      employee.email = email;
    }

    await employee.save();

    const { password: _, ...employeeResponse } = employee.toJSON();

    res.json({
      message: "Employee updated successfully",
      employee: employeeResponse,
    });
  } catch (error) {
    console.error("Update employee error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Delete employee (System Admin only)
 */
export const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await Employee.findByPk(id);
    if (!employee) {
      return res.status(404).json({
        error: "Not found",
        message: "Employee not found",
      });
    }

    // Prevent deleting yourself
    if (req.user.id === parseInt(id)) {
      return res.status(400).json({
        error: "Bad request",
        message: "You cannot delete your own account",
      });
    }

    // Soft delete (deactivate) instead of hard delete
    employee.is_active = false;
    await employee.save();

    res.json({
      message: "Employee deactivated successfully",
    });
  } catch (error) {
    console.error("Delete employee error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Block employee account (HR/Executive/System Admin only)
 * HR and Executive can block employees on their own - no System Admin needed
 */
export const blockEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { duration_days, reason } = req.body;

    // Validation
    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        error: "Validation error",
        message: "Block reason is required",
      });
    }

    const employee = await Employee.findByPk(id);
    if (!employee) {
      return res.status(404).json({
        error: "Not found",
        message: "Employee not found",
      });
    }

    // Prevent blocking yourself
    if (req.user.id === parseInt(id)) {
      return res.status(400).json({
        error: "Bad request",
        message: "You cannot block your own account",
      });
    }

    // Prevent blocking System Admin (only System Admin can block other System Admins)
    if (employee.role === "System Admin" && req.user.role !== "System Admin") {
      return res.status(403).json({
        error: "Forbidden",
        message: "Only System Admin can block other System Admins",
      });
    }

    // Calculate blocked_until date
    let blockedUntil = null;
    if (duration_days && duration_days > 0) {
      const blockDate = new Date();
      blockDate.setDate(blockDate.getDate() + parseInt(duration_days));
      blockedUntil = blockDate;
    }
    // If no duration specified, block is permanent until manually unblocked

    // Update employee
    employee.is_blocked = true;
    employee.blocked_until = blockedUntil;
    employee.block_reason = reason.trim();
    employee.blocked_by = req.user.id;

    await employee.save();

    const { password: _, ...employeeResponse } = employee.toJSON();

    res.json({
      message: `Employee blocked successfully${blockedUntil ? ` until ${blockedUntil.toISOString()}` : " (permanent)"}`,
      employee: employeeResponse,
      blocked_until: blockedUntil,
    });
  } catch (error) {
    console.error("Block employee error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Unblock employee account (HR/Executive/System Admin only)
 */
export const unblockEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await Employee.findByPk(id);
    if (!employee) {
      return res.status(404).json({
        error: "Not found",
        message: "Employee not found",
      });
    }

    // Prevent unblocking System Admin (only System Admin can unblock System Admins)
    if (employee.role === "System Admin" && req.user.role !== "System Admin") {
      return res.status(403).json({
        error: "Forbidden",
        message: "Only System Admin can unblock System Admins",
      });
    }

    // Unblock employee
    employee.is_blocked = false;
    employee.blocked_until = null;
    employee.block_reason = null;
    employee.blocked_by = null;

    await employee.save();

    const { password: _, ...employeeResponse } = employee.toJSON();

    res.json({
      message: "Employee unblocked successfully",
      employee: employeeResponse,
    });
  } catch (error) {
    console.error("Unblock employee error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Get employee statistics (System Admin/HR/Executive only)
 */
export const getEmployeeStats = async (req, res) => {
  try {
    const totalEmployees = await Employee.count();
    const activeEmployees = await Employee.count({ where: { is_active: true } });
    const inactiveEmployees = await Employee.count({ where: { is_active: false } });
    const blockedEmployees = await Employee.count({ where: { is_blocked: true } });
    
    // Check for expired blocks that need auto-unblocking
    const now = new Date();
    const expiredBlocks = await Employee.findAll({
      where: {
        is_blocked: true,
        blocked_until: { [Op.lt]: now },
      },
    });
    
    // Auto-unblock expired blocks
    for (const employee of expiredBlocks) {
      employee.is_blocked = false;
      employee.blocked_until = null;
      employee.block_reason = null;
      employee.blocked_by = null;
      await employee.save();
    }
    
    // Recalculate after auto-unblocking
    const currentBlockedEmployees = await Employee.count({ where: { is_blocked: true } });

    const employeesByRole = await Employee.findAll({
      attributes: [
        "role",
        [Employee.sequelize.fn("COUNT", Employee.sequelize.col("id")), "count"],
      ],
      group: ["role"],
    });

    const employeesByDepartment = await Employee.findAll({
      attributes: [
        "department",
        [Employee.sequelize.fn("COUNT", Employee.sequelize.col("id")), "count"],
      ],
      group: ["department"],
      where: { department: { [Op.ne]: null } },
    });

    res.json({
      totalEmployees,
      activeEmployees,
      inactiveEmployees,
      blockedEmployees: currentBlockedEmployees,
      autoUnblocked: expiredBlocks.length,
      employeesByRole,
      employeesByDepartment,
    });
  } catch (error) {
    console.error("Get employee stats error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

