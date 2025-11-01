import { Op } from "sequelize";
import Report from "../models/Report.js";
import Employee from "../models/Employee.js";
import Department from "../models/Department.js";

/**
 * Get all reports (HR/Executive/System Admin only, or Department Managers for their dept)
 */
export const getAllReports = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, report_type, employee_id, assigned_to_department_id } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (status) where.status = status;
    if (report_type) where.report_type = report_type;
    if (employee_id) where.employee_id = employee_id;
    if (assigned_to_department_id) where.assigned_to_department_id = assigned_to_department_id;

    // Check if user is department manager
    let isDeptManager = false;
    let userDeptId = null;

    if (req.user.role === "Employee" && !["HR", "Executive", "System Admin"].includes(req.user.userType)) {
      const userDept = await Department.findOne({
        where: {
          manager_id: req.user.id,
        },
      });

      if (userDept) {
        isDeptManager = true;
        userDeptId = userDept.id;
        // Department managers can only see reports assigned to their department
        where.assigned_to_department_id = userDept.id;
      } else {
        // Not HR and not a manager - no access
        return res.status(403).json({
          error: "Forbidden",
          message: "You don't have permission to view all reports",
        });
      }
    } else if (!["HR", "Executive", "System Admin"].includes(req.user.role)) {
      // Not HR, Executive, Admin, or Dept Manager - no access
      return res.status(403).json({
        error: "Forbidden",
        message: "You don't have permission to view all reports",
      });
    }

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
          required: false,
        },
      ],
    });

    // Hide employee info ONLY for anonymous reports
    const sanitizedReports = reports.rows.map((report) => {
      const reportData = report.toJSON();
      // Only hide if explicitly marked as anonymous
      if (reportData.is_anonymous === true) {
        reportData.employee = null;
        reportData.employee_id = null;
        reportData.created_by = null;
        reportData.created_by_type = null;
      }
      // For non-anonymous reports, show full employee info
      return reportData;
    });

    res.json({
      reports: sanitizedReports,
      total: reports.count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(reports.count / limit),
    });
  } catch (error) {
    console.error("Get all reports error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Get reports for current user
 */
export const getMyReports = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.userType;
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;

    const where = {};

    // Employees can see their own reports OR reports assigned to them as department manager
    if (userType === "Employee") {
      // Check if employee is a department manager
      const userDept = await Department.findOne({
        where: {
          manager_id: userId,
        },
      });

      if (userDept) {
        // Department manager: see reports assigned to their department OR their own reports
        where[Op.or] = [
          { employee_id: userId },
          { assigned_to_department_id: userDept.id },
          { assigned_to_manager_id: userId },
        ];
      } else {
        // Regular employee: only their own reports
        where.employee_id = userId;
      }
    }
    // HR/Executive/System Admin can see reports they created or were assigned to review
    else {
      where.created_by = userId;
    }

    if (status) where.status = status;

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
          required: false,
        },
      ],
    });

    // Hide employee info ONLY for anonymous reports
    const sanitizedReports = reports.rows.map((report) => {
      const reportData = report.toJSON();
      // Only hide if explicitly marked as anonymous
      if (reportData.is_anonymous === true) {
        // HR/Admin can see employee but not the creator in the report itself
        if (!["HR", "Executive", "System Admin"].includes(req.user.role)) {
          reportData.employee = null;
          reportData.employee_id = null;
        }
        reportData.created_by = null; // Always hide creator for anonymous
        reportData.created_by_type = null;
      }
      // For non-anonymous reports, show full employee and creator info
      return reportData;
    });

    res.json({
      reports: sanitizedReports,
      total: reports.count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(reports.count / limit),
    });
  } catch (error) {
    console.error("Get my reports error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Get report by ID
 */
export const getReportById = async (req, res) => {
  try {
    const { id } = req.params;

    const report = await Report.findByPk(id, {
      include: [
        {
          model: Employee,
          as: "employee",
          attributes: ["id", "full_name", "email", "department"],
        },
      ],
    });

    if (!report) {
      return res.status(404).json({
        error: "Not found",
        message: "Report not found",
      });
    }

    // Check permissions
    const isAdmin = ["System Admin", "HR", "Executive"].includes(req.user.role);
    const isOwner = report.created_by === req.user.id;
    const isReportedEmployee = report.employee_id === req.user.id && req.user.userType === "Employee";
    
    // Check if user is assigned department manager
    const isAssignedManager = report.assigned_to_manager_id === req.user.id;
    let isDeptManager = false;
    if (report.assigned_to_department_id) {
      const dept = await Department.findByPk(report.assigned_to_department_id);
      if (dept && dept.manager_id === req.user.id) {
        isDeptManager = true;
      }
    }

    if (!isAdmin && !isOwner && !isReportedEmployee && !isAssignedManager && !isDeptManager) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You don't have permission to view this report",
      });
    }

    // Hide employee info only if anonymous
    const reportData = report.toJSON();
    if (reportData.is_anonymous === true) {
      if (!isAdmin) {
        reportData.employee = null;
        reportData.employee_id = null;
      }
      reportData.created_by = null;
      reportData.created_by_type = null;
    }

    res.json({
      report: reportData,
    });
  } catch (error) {
    console.error("Get report by ID error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Create report
 */
export const createReport = async (req, res) => {
  try {
    const { employee_id, report_type, title, description, is_anonymous } = req.body;

    // Validation
    if (!report_type || !title || !description) {
      return res.status(400).json({
        error: "Validation error",
        message: "Report type, title, and description are required",
      });
    }

    // For anonymous reports, employee_id is optional
    // For non-anonymous, employee_id is required (unless user is reporting for themselves)
    const finalEmployeeId = is_anonymous ? null : (employee_id || req.user.id);

    if (!is_anonymous && finalEmployeeId) {
      // Check if employee exists
      const employee = await Employee.findByPk(finalEmployeeId);
      if (!employee) {
        return res.status(404).json({
          error: "Not found",
          message: "Employee not found",
        });
      }
    }

    // Validate report type
    const validTypes = ["Attendance", "Performance", "Payroll", "General"];
    if (!validTypes.includes(report_type)) {
      return res.status(400).json({
        error: "Validation error",
        message: "Invalid report type",
      });
    }

    // Create report
    const report = await Report.create({
      employee_id: finalEmployeeId,
      is_anonymous: is_anonymous || false,
      report_type,
      title,
      description,
      status: "Pending",
      created_by: is_anonymous ? 0 : req.user.id, // Use 0 for anonymous to mask identity
      created_by_type: req.user.userType || "Employee",
    });

    res.status(201).json({
      message: "Report created successfully",
      report,
    });
  } catch (error) {
    console.error("Create report error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Update report (HR/Executive/System Admin or assigned Department Manager)
 */
export const updateReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, resolution_notes, assigned_to_department_id, assigned_to_manager_id } = req.body;

    const report = await Report.findByPk(id, {
      include: [
        {
          model: Employee,
          as: "employee",
          attributes: ["id", "full_name", "email", "department"],
        },
      ],
    });

    if (!report) {
      return res.status(404).json({
        error: "Not found",
        message: "Report not found",
      });
    }

    // Check permissions
    const isHR = ["System Admin", "HR", "Executive"].includes(req.user.role);
    const isAssignedManager = report.assigned_to_manager_id === req.user.id;
    
    let isDeptManager = false;
    if (report.assigned_to_department_id) {
      const dept = await Department.findByPk(report.assigned_to_department_id);
      if (dept && dept.manager_id === req.user.id) {
        isDeptManager = true;
      }
    }

    // HR can update anything, department managers can only update assigned reports
    if (!isHR && !isAssignedManager && !isDeptManager) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You don't have permission to update this report",
      });
    }

    // Validate status
    if (status) {
      const validStatuses = ["Pending", "In Progress", "Resolved", "Rejected"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: "Validation error",
          message: "Invalid status",
        });
      }

      report.status = status;
      // Only HR can set reviewed_by when updating status
      if (isHR) {
        report.reviewed_by = req.user.id;
        report.reviewed_by_type = req.user.role;
      }
    }

    // HR can assign to department
    if (assigned_to_department_id !== undefined && isHR) {
      if (assigned_to_department_id) {
        const department = await Department.findByPk(assigned_to_department_id);
        if (!department) {
          return res.status(404).json({
            error: "Not found",
            message: "Department not found",
          });
        }

        report.assigned_to_department_id = assigned_to_department_id;
        report.assigned_at = new Date();
        report.assigned_by = req.user.id;

        // Auto-assign to department manager if manager exists
        if (department.manager_id && !assigned_to_manager_id) {
          report.assigned_to_manager_id = department.manager_id;
        }
      } else {
        // Unassign from department
        report.assigned_to_department_id = null;
        report.assigned_to_manager_id = null;
        report.assigned_at = null;
        report.assigned_by = null;
      }
    }

    // HR can assign to specific manager
    if (assigned_to_manager_id !== undefined && isHR) {
      if (assigned_to_manager_id) {
        const manager = await Employee.findByPk(assigned_to_manager_id);
        if (!manager) {
          return res.status(404).json({
            error: "Not found",
            message: "Manager not found",
          });
        }

        report.assigned_to_manager_id = assigned_to_manager_id;
        if (!report.assigned_to_department_id && manager.department) {
          // Auto-assign department if not already assigned
          const dept = await Department.findOne({ where: { name: manager.department } });
          if (dept) {
            report.assigned_to_department_id = dept.id;
          }
        }
        if (!report.assigned_at) {
          report.assigned_at = new Date();
          report.assigned_by = req.user.id;
        }
      } else {
        report.assigned_to_manager_id = null;
      }
    }

    if (resolution_notes !== undefined) {
      report.resolution_notes = resolution_notes;
    }

    await report.save();
    await report.reload({
      include: [
        {
          model: Employee,
          as: "employee",
          attributes: ["id", "full_name", "email", "department"],
        },
      ],
    });

    res.json({
      message: "Report updated successfully",
      report,
    });
  } catch (error) {
    console.error("Update report error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Delete report (System Admin or creator only)
 */
export const deleteReport = async (req, res) => {
  try {
    const { id } = req.params;

    const report = await Report.findByPk(id);
    if (!report) {
      return res.status(404).json({
        error: "Not found",
        message: "Report not found",
      });
    }

    // Check permissions
    const isAdmin = req.user.role === "System Admin";
    const isCreator = report.created_by === req.user.id;

    if (!isAdmin && !isCreator) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You don't have permission to delete this report",
      });
    }

    await report.destroy();

    res.json({
      message: "Report deleted successfully",
    });
  } catch (error) {
    console.error("Delete report error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};
