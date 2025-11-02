import Employee from "../models/Employee.js";
import HR from "../models/HR.js";
import Executive from "../models/Executive.js";
import Message from "../models/Message.js";
import Report from "../models/Report.js";
import bcrypt from "bcrypt";
import { Op, fn, col } from "sequelize";
import { sendWelcomeEmail } from "../utils/emailUtils.js";

/**
 * ============================================
 * SYSTEM ADMIN DASHBOARD & STATISTICS
 * ============================================
 */

/**
 * Get comprehensive system dashboard data
 */
export const getSystemDashboard = async (req, res) => {
  try {
    // Employee statistics
    const totalEmployees = await Employee.count();
    const activeEmployees = await Employee.count({
      where: { is_active: true },
    });
    const blockedEmployees = await Employee.count({
      where: { is_blocked: true },
    });
    const employeesByRole = await Employee.findAll({
      attributes: ["role", [fn("COUNT", col("id")), "count"]],
      group: ["role"],
      raw: true,
    });

    // HR statistics
    const totalHR = await HR.count();
    const activeHR = await HR.count({ where: { is_active: true } });

    // Executive statistics
    const totalExecutives = await Executive.count();
    const activeExecutives = await Executive.count({
      where: { is_active: true },
    });

    // Message statistics
    const totalMessages = await Message.count();
    const unreadMessages = await Message.count({ where: { is_read: false } });

    // Report statistics
    const totalReports = await Report.count();
    const pendingReports = await Report.count({ where: { status: "Pending" } });
    const reportsByType = await Report.findAll({
      attributes: ["report_type", [fn("COUNT", col("id")), "count"]],
      group: ["report_type"],
      raw: true,
    });

    // Recent activity (last 10 messages)
    const recentMessages = await Message.findAll({
      limit: 10,
      order: [["createdAt", "DESC"]],
      attributes: ["id", "subject", "sender_id", "sender_type", "createdAt"],
    });

    // Recent reports (last 10)
    const recentReports = await Report.findAll({
      limit: 10,
      order: [["createdAt", "DESC"]],
      attributes: ["id", "title", "report_type", "status", "createdAt"],
    });

    res.json({
      dashboard: {
        employees: {
          total: totalEmployees,
          active: activeEmployees,
          blocked: blockedEmployees,
          byRole: employeesByRole,
        },
        hr: {
          total: totalHR,
          active: activeHR,
        },
        executives: {
          total: totalExecutives,
          active: activeExecutives,
        },
        messages: {
          total: totalMessages,
          unread: unreadMessages,
        },
        reports: {
          total: totalReports,
          pending: pendingReports,
          byType: reportsByType,
        },
        recentActivity: {
          messages: recentMessages,
          reports: recentReports,
        },
      },
    });
  } catch (error) {
    console.error("Get system dashboard error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Get all users across all types (System Admin only)
 */
export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, user_type, search } = req.query;
    const offset = (page - 1) * limit;

    let allUsers = [];

    // Get employees
    if (!user_type || user_type === "Employee") {
      const employees = await Employee.findAll({
        attributes: { exclude: ["password"] },
      });
      allUsers = allUsers.concat(
        employees.map((emp) => ({
          ...emp.toJSON(),
          user_type: "Employee",
        }))
      );
    }

    // Get HR
    if (!user_type || user_type === "HR") {
      const hrStaff = await HR.findAll({
        attributes: { exclude: ["password"] },
      });
      allUsers = allUsers.concat(
        hrStaff.map((hr) => ({
          ...hr.toJSON(),
          user_type: "HR",
        }))
      );
    }

    // Get Executives
    if (!user_type || user_type === "Executive") {
      const executives = await Executive.findAll({
        attributes: { exclude: ["password"] },
      });
      allUsers = allUsers.concat(
        executives.map((exec) => ({
          ...exec.toJSON(),
          user_type: "Executive",
        }))
      );
    }

    // Search filter
    if (search) {
      allUsers = allUsers.filter(
        (user) =>
          (user.full_name || user.name || "")
            .toLowerCase()
            .includes(search.toLowerCase()) ||
          (user.email || "").toLowerCase().includes(search.toLowerCase())
      );
    }

    // Pagination
    const total = allUsers.length;
    const paginatedUsers = allUsers.slice(offset, offset + parseInt(limit));

    res.json({
      users: paginatedUsers,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Get user by ID across all types
 */
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_type } = req.query;

    let user = null;

    if (!user_type || user_type === "Employee") {
      user = await Employee.findByPk(id, {
        attributes: { exclude: ["password"] },
      });
      if (user) {
        return res.json({
          user: { ...user.toJSON(), user_type: "Employee" },
        });
      }
    }

    if (!user_type || user_type === "HR") {
      user = await HR.findByPk(id, {
        attributes: { exclude: ["password"] },
      });
      if (user) {
        return res.json({
          user: { ...user.toJSON(), user_type: "HR" },
        });
      }
    }

    if (!user_type || user_type === "Executive") {
      user = await Executive.findByPk(id, {
        attributes: { exclude: ["password"] },
      });
      if (user) {
        return res.json({
          user: { ...user.toJSON(), user_type: "Executive" },
        });
      }
    }

    return res.status(404).json({
      error: "Not found",
      message: "User not found",
    });
  } catch (error) {
    console.error("Get user by ID error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Update any user (System Admin only)
 */
export const updateAnyUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_type, ...updateData } = req.body;

    if (!user_type) {
      return res.status(400).json({
        error: "Validation error",
        message: "user_type is required",
      });
    }

    let user;
    switch (user_type) {
      case "Employee":
        user = await Employee.findByPk(id);
        break;
      case "HR":
        user = await HR.findByPk(id);
        break;
      case "Executive":
        user = await Executive.findByPk(id);
        break;
      default:
        return res.status(400).json({
          error: "Validation error",
          message: "Invalid user_type",
        });
    }

    if (!user) {
      return res.status(404).json({
        error: "Not found",
        message: "User not found",
      });
    }

    // Prevent updating yourself to inactive or blocked
    if (user.id === req.user.id) {
      if (updateData.is_active === false) {
        return res.status(400).json({
          error: "Bad request",
          message: "You cannot deactivate your own account",
        });
      }
      if (updateData.is_blocked === true) {
        return res.status(400).json({
          error: "Bad request",
          message: "You cannot block your own account",
        });
      }
    }

    // Update fields
    Object.keys(updateData).forEach((key) => {
      if (user[key] !== undefined) {
        user[key] = updateData[key];
      }
    });

    await user.save();

    const { password: _, ...userResponse } = user.toJSON();

    res.json({
      message: "User updated successfully",
      user: { ...userResponse, user_type },
    });
  } catch (error) {
    console.error("Update any user error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Delete/Deactivate any user (System Admin only)
 */
export const deleteAnyUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_type } = req.query;

    if (!user_type) {
      return res.status(400).json({
        error: "Validation error",
        message: "user_type is required",
      });
    }

    let user;
    switch (user_type) {
      case "Employee":
        user = await Employee.findByPk(id);
        break;
      case "HR":
        user = await HR.findByPk(id);
        break;
      case "Executive":
        user = await Executive.findByPk(id);
        break;
      default:
        return res.status(400).json({
          error: "Validation error",
          message: "Invalid user_type",
        });
    }

    if (!user) {
      return res.status(404).json({
        error: "Not found",
        message: "User not found",
      });
    }

    // Prevent deleting yourself
    if (user.id === req.user.id) {
      return res.status(400).json({
        error: "Bad request",
        message: "You cannot delete your own account",
      });
    }

    // Soft delete (deactivate)
    user.is_active = false;
    await user.save();

    res.json({
      message: "User deactivated successfully",
    });
  } catch (error) {
    console.error("Delete any user error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Block/Unblock any user (System Admin only)
 */
export const blockAnyUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_type, duration_days, reason } = req.body;

    if (!user_type || !reason) {
      return res.status(400).json({
        error: "Validation error",
        message: "user_type and reason are required",
      });
    }

    let user;
    switch (user_type) {
      case "Employee":
        user = await Employee.findByPk(id);
        break;
      case "HR":
        user = await HR.findByPk(id);
        break;
      case "Executive":
        user = await Executive.findByPk(id);
        break;
      default:
        return res.status(400).json({
          error: "Validation error",
          message: "Invalid user_type",
        });
    }

    if (!user) {
      return res.status(404).json({
        error: "Not found",
        message: "User not found",
      });
    }

    // Prevent blocking yourself
    if (user.id === req.user.id) {
      return res.status(400).json({
        error: "Bad request",
        message: "You cannot block your own account",
      });
    }

    // Calculate blocked_until date
    let blockedUntil = null;
    if (duration_days && duration_days > 0) {
      const blockDate = new Date();
      blockDate.setDate(blockDate.getDate() + parseInt(duration_days));
      blockedUntil = blockDate;
    }

    // Update user
    user.is_blocked = true;
    if (blockedUntil) user.blocked_until = blockedUntil;
    user.block_reason = reason.trim();
    user.blocked_by = req.user.id;

    await user.save();

    const { password: _, ...userResponse } = user.toJSON();

    res.json({
      message: `User blocked successfully${
        blockedUntil ? ` until ${blockedUntil.toISOString()}` : " (permanent)"
      }`,
      user: { ...userResponse, user_type },
      blocked_until: blockedUntil,
    });
  } catch (error) {
    console.error("Block any user error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

export const unblockAnyUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_type } = req.query;

    if (!user_type) {
      return res.status(400).json({
        error: "Validation error",
        message: "user_type is required",
      });
    }

    let user;
    switch (user_type) {
      case "Employee":
        user = await Employee.findByPk(id);
        break;
      case "HR":
        user = await HR.findByPk(id);
        break;
      case "Executive":
        user = await Executive.findByPk(id);
        break;
      default:
        return res.status(400).json({
          error: "Validation error",
          message: "Invalid user_type",
        });
    }

    if (!user) {
      return res.status(404).json({
        error: "Not found",
        message: "User not found",
      });
    }

    // Unblock user
    user.is_blocked = false;
    user.blocked_until = null;
    user.block_reason = null;
    user.blocked_by = null;

    await user.save();

    const { password: _, ...userResponse } = user.toJSON();

    res.json({
      message: "User unblocked successfully",
      user: { ...userResponse, user_type },
    });
  } catch (error) {
    console.error("Unblock any user error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * ============================================
 * SYSTEM ADMIN - ALL MESSAGES ACCESS
 * ============================================
 */

/**
 * Get all messages in the system (System Admin only)
 */
export const getAllSystemMessages = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      is_read,
      sender_type,
      receiver_type,
    } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (is_read !== undefined) where.is_read = is_read === "true";
    if (sender_type) where.sender_type = sender_type;
    if (receiver_type) where.receiver_type = receiver_type;

    const messages = await Message.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["createdAt", "DESC"]],
    });

    res.json({
      messages: messages.rows,
      total: messages.count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(messages.count / limit),
    });
  } catch (error) {
    console.error("Get all system messages error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Delete any message (System Admin only)
 */
export const deleteAnyMessage = async (req, res) => {
  try {
    const { id } = req.params;

    const message = await Message.findByPk(id);
    if (!message) {
      return res.status(404).json({
        error: "Not found",
        message: "Message not found",
      });
    }

    await message.destroy();

    res.json({
      message: "Message deleted successfully",
    });
  } catch (error) {
    console.error("Delete any message error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * ============================================
 * SYSTEM ADMIN - ALL REPORTS ACCESS
 * ============================================
 */

/**
 * Get all reports in the system (System Admin only)
 */
export const getAllSystemReports = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, report_type } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (status) where.status = status;
    if (report_type) where.report_type = report_type;

    const reports = await Report.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: Employee,
          as: "employee",
          attributes: ["id", "full_name", "email", "department"],
        },
      ],
    });

    res.json({
      reports: reports.rows,
      total: reports.count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(reports.count / limit),
    });
  } catch (error) {
    console.error("Get all system reports error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Update any report (System Admin only)
 */
export const updateAnyReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, resolution_notes } = req.body;

    const report = await Report.findByPk(id);
    if (!report) {
      return res.status(404).json({
        error: "Not found",
        message: "Report not found",
      });
    }

    if (status) {
      const validStatuses = ["Pending", "In Progress", "Resolved", "Rejected"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: "Validation error",
          message: "Invalid status",
        });
      }

      report.status = status;
      report.reviewed_by = req.user.id;
      report.reviewed_by_type = "System Admin";
    }

    if (resolution_notes !== undefined) {
      report.resolution_notes = resolution_notes;
    }

    await report.save();

    res.json({
      message: "Report updated successfully",
      report,
    });
  } catch (error) {
    console.error("Update any report error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Delete any report (System Admin only)
 */
export const deleteAnyReport = async (req, res) => {
  try {
    const { id } = req.params;

    const report = await Report.findByPk(id);
    if (!report) {
      return res.status(404).json({
        error: "Not found",
        message: "Report not found",
      });
    }

    await report.destroy();

    res.json({
      message: "Report deleted successfully",
    });
  } catch (error) {
    console.error("Delete any report error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * ============================================
 * SYSTEM ADMIN - PAYROLL MANAGEMENT
 * ============================================
 */

/**
 * Get all payroll data (System Admin only)
 */
export const getAllPayrollData = async (req, res) => {
  try {
    const employees = await Employee.findAll({
      where: { is_active: true },
      attributes: [
        "id",
        "full_name",
        "email",
        "department",
        "role",
        "current_salary",
        "bonus",
      ],
      order: [["full_name", "ASC"]],
    });

    const payrollData = employees.map((employee) => ({
      employee_id: employee.id,
      employee_name: employee.full_name,
      email: employee.email,
      department: employee.department,
      role: employee.role,
      salary: employee.current_salary,
      bonus: employee.bonus || 0,
      total:
        parseFloat(employee.current_salary) + parseFloat(employee.bonus || 0),
    }));

    const totalPayroll = payrollData.reduce((sum, emp) => sum + emp.total, 0);

    res.json({
      payroll: payrollData,
      total_employees: employees.length,
      total_payroll: totalPayroll,
      average_salary: totalPayroll / employees.length || 0,
    });
  } catch (error) {
    console.error("Get all payroll data error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Bulk update salaries (System Admin only)
 */
export const bulkUpdateSalaries = async (req, res) => {
  try {
    const { updates } = req.body; // Array of {employee_id, salary, bonus}

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        error: "Validation error",
        message: "Updates array is required",
      });
    }

    const results = [];
    for (const update of updates) {
      const { employee_id, salary, bonus } = update;

      if (!employee_id) {
        results.push({
          employee_id,
          success: false,
          error: "Employee ID is required",
        });
        continue;
      }

      try {
        const employee = await Employee.findByPk(employee_id);
        if (!employee) {
          results.push({
            employee_id,
            success: false,
            error: "Employee not found",
          });
          continue;
        }

        if (salary !== undefined) employee.current_salary = salary;
        if (bonus !== undefined) employee.bonus = bonus;

        await employee.save();

        results.push({
          employee_id,
          success: true,
          message: "Updated successfully",
        });
      } catch (err) {
        results.push({
          employee_id,
          success: false,
          error: err.message,
        });
      }
    }

    res.json({
      message: "Bulk update completed",
      results,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    });
  } catch (error) {
    console.error("Bulk update salaries error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * ============================================
 * SYSTEM ADMIN - USER MANAGEMENT
 * ============================================
 */

/**
 * Create System Admin user (special endpoint for first admin creation)
 */
export const createSystemAdmin = async (req, res) => {
  try {
    const { full_name, email, password, department } = req.body;

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

    // Check if email already exists in any table
    const existingEmployee = await Employee.findOne({ where: { email } });
    const existingHR = await HR.findOne({ where: { email } });
    const existingExecutive = await Executive.findOne({ where: { email } });

    if (existingEmployee || existingHR || existingExecutive) {
      return res.status(409).json({
        error: "Conflict",
        message: "User with this email already exists",
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create System Admin as Employee with System Admin role
    const admin = await Employee.create({
      full_name,
      email,
      password: hashedPassword,
      role: "System Admin",
      department,
      is_active: true,
      is_blocked: false,
    });

    // Send welcome email
    try {
      await sendWelcomeEmail(
        email,
        full_name,
        password,
        "System Admin",
        department
      );
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
    }

    const { password: _, ...adminResponse } = admin.toJSON();

    res.status(201).json({
      message: "System Admin created successfully",
      admin: adminResponse,
    });
  } catch (error) {
    console.error("Create System Admin error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Get all System Admins
 */
export const getAllSystemAdmins = async (req, res) => {
  try {
    const admins = await Employee.findAll({
      where: { role: "System Admin" },
      attributes: { exclude: ["password"] },
      order: [["createdAt", "DESC"]],
    });

    res.json({
      admins,
      total: admins.length,
    });
  } catch (error) {
    console.error("Get all System Admins error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * ============================================
 * SYSTEM ADMIN - SYSTEM CONFIGURATION
 * ============================================
 */

/**
 * Get system configuration summary
 */
export const getSystemConfig = async (req, res) => {
  try {
    res.json({
      system: {
        version: "1.0.0",
        environment: process.env.NODE_ENV || "development",
        database: {
          postgresql: "Connected",
          mongodb: "Connected",
        },
        features: {
          email_notifications: !!process.env.EMAIL_USER,
          whatsapp_notifications: !!process.env.WHATSAPP_API_KEY,
          blocking: true,
          appeals: true,
          escalation: true,
        },
      },
    });
  } catch (error) {
    console.error("Get system config error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};
