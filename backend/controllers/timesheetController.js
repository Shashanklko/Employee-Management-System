import { Op } from "sequelize";
import Timesheet from "../models/Timesheet.js";
import Employee from "../models/Employee.js";
import Project from "../models/Project.js";
import Task from "../models/Task.js";
import { createAuditLog, getClientIP, getUserAgent } from "../utils/auditLogger.js";

/**
 * Log timesheet entry
 */
export const logTimesheet = async (req, res) => {
  try {
    const { project_id, task_id, date, hours, description } = req.body;
    const employee_id = req.user.id;

    if (!date || !hours || hours <= 0) {
      return res.status(400).json({
        error: "Date and hours (greater than 0) are required",
      });
    }

    if (hours > 24) {
      return res.status(400).json({
        error: "Hours cannot exceed 24 per day",
      });
    }

    // Validate project if provided
    if (project_id) {
      const project = await Project.findByPk(project_id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
    }

    // Validate task if provided
    if (task_id) {
      const task = await Task.findByPk(task_id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      // Ensure task belongs to project if both are provided
      if (project_id && task.project_id !== parseInt(project_id)) {
        return res.status(400).json({
          error: "Task does not belong to the specified project",
        });
      }
    }

    const timesheet = await Timesheet.create({
      employee_id,
      project_id: project_id || null,
      task_id: task_id || null,
      date,
      hours: parseFloat(hours),
      description,
      status: "Pending",
    });

    // Update task actual hours if task_id is provided
    if (task_id) {
      const task = await Task.findByPk(task_id);
      if (task) {
        const totalHours = await Timesheet.sum("hours", {
          where: {
            task_id: task_id,
            status: { [Op.in]: ["Pending", "Approved"] },
          },
        });
        await task.update({ actual_hours: totalHours || 0 });
      }
    }

    // Audit log
    await createAuditLog({
      action: "LOG_TIMESHEET",
      entity_type: "Timesheet",
      entity_id: timesheet.id,
      user_id: req.user.id,
      user_type: req.user.role,
      user_email: req.user.email,
      ip_address: getClientIP(req),
      user_agent: getUserAgent(req),
      changes: { created: timesheet.toJSON() },
    });

    res.status(201).json({
      message: "Timesheet entry logged successfully",
      timesheet,
    });
  } catch (error) {
    console.error("Log timesheet error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Get timesheet entries
 */
export const getTimesheets = async (req, res) => {
  try {
    const { employee_id, project_id, task_id, start_date, end_date, status } = req.query;
    const queryEmployeeId = employee_id || req.user.id;

    // Permission check
    if (employee_id && employee_id != req.user.id) {
      if (!["HR", "Executive", "System Admin"].includes(req.user.role)) {
        return res.status(403).json({
          error: "You don't have permission to view this timesheet",
        });
      }
    }

    const where = { employee_id: queryEmployeeId };

    if (project_id) where.project_id = project_id;
    if (task_id) where.task_id = task_id;
    if (status) where.status = status;
    if (start_date && end_date) {
      where.date = {
        [Op.between]: [start_date, end_date],
      };
    }

    const timesheets = await Timesheet.findAll({
      where,
      include: [
        {
          model: Employee,
          attributes: ["id", "full_name", "email"],
        },
        {
          model: Project,
          attributes: ["id", "name"],
          required: false,
        },
        {
          model: Task,
          attributes: ["id", "title"],
          required: false,
        },
      ],
      order: [["date", "DESC"]],
    });

    res.json({
      timesheets,
      total: timesheets.length,
      total_hours: timesheets.reduce((sum, t) => sum + (t.hours || 0), 0),
    });
  } catch (error) {
    console.error("Get timesheets error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Approve timesheet (HR/Executive/System Admin only)
 */
export const approveTimesheet = async (req, res) => {
  try {
    const { id } = req.params;

    const timesheet = await Timesheet.findByPk(id);
    if (!timesheet) {
      return res.status(404).json({ error: "Timesheet entry not found" });
    }

    if (timesheet.status !== "Pending") {
      return res.status(400).json({
        error: `Timesheet is already ${timesheet.status}`,
      });
    }

    const oldData = { ...timesheet.toJSON() };

    await timesheet.update({
      status: "Approved",
      approved_by: req.user.id,
      approved_by_type: req.user.role,
      approved_at: new Date(),
    });

    await timesheet.reload();

    // Audit log
    await createAuditLog({
      action: "APPROVE_TIMESHEET",
      entity_type: "Timesheet",
      entity_id: timesheet.id,
      user_id: req.user.id,
      user_type: req.user.role,
      user_email: req.user.email,
      ip_address: getClientIP(req),
      user_agent: getUserAgent(req),
      changes: {
        before: oldData,
        after: timesheet.toJSON(),
      },
    });

    res.json({
      message: "Timesheet approved successfully",
      timesheet,
    });
  } catch (error) {
    console.error("Approve timesheet error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Reject timesheet (HR/Executive/System Admin only)
 */
export const rejectTimesheet = async (req, res) => {
  try {
    const { id } = req.params;

    const timesheet = await Timesheet.findByPk(id);
    if (!timesheet) {
      return res.status(404).json({ error: "Timesheet entry not found" });
    }

    if (timesheet.status !== "Pending") {
      return res.status(400).json({
        error: `Timesheet is already ${timesheet.status}`,
      });
    }

    const oldData = { ...timesheet.toJSON() };

    await timesheet.update({
      status: "Rejected",
      approved_by: req.user.id,
      approved_by_type: req.user.role,
      approved_at: new Date(),
    });

    await timesheet.reload();

    // Audit log
    await createAuditLog({
      action: "REJECT_TIMESHEET",
      entity_type: "Timesheet",
      entity_id: timesheet.id,
      user_id: req.user.id,
      user_type: req.user.role,
      user_email: req.user.email,
      ip_address: getClientIP(req),
      user_agent: getUserAgent(req),
      changes: {
        before: oldData,
        after: timesheet.toJSON(),
      },
    });

    res.json({
      message: "Timesheet rejected",
      timesheet,
    });
  } catch (error) {
    console.error("Reject timesheet error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Update timesheet (owner or admin)
 */
export const updateTimesheet = async (req, res) => {
  try {
    const { id } = req.params;
    const { project_id, task_id, date, hours, description } = req.body;

    const timesheet = await Timesheet.findByPk(id);
    if (!timesheet) {
      return res.status(404).json({ error: "Timesheet entry not found" });
    }

    // Permission check: Only owner or admin can update
    const isAdmin = ["HR", "Executive", "System Admin"].includes(req.user.role);
    if (!isAdmin && timesheet.employee_id !== req.user.id) {
      return res.status(403).json({
        error: "You can only update your own timesheet entries",
      });
    }

    // Can't update if already approved
    if (timesheet.status === "Approved" && !isAdmin) {
      return res.status(400).json({
        error: "Cannot update approved timesheet",
      });
    }

    const oldData = { ...timesheet.toJSON() };

    // Validate inputs
    if (hours !== undefined) {
      if (hours <= 0 || hours > 24) {
        return res.status(400).json({
          error: "Hours must be between 0 and 24",
        });
      }
    }

    await timesheet.update({
      ...(project_id !== undefined && { project_id }),
      ...(task_id !== undefined && { task_id }),
      ...(date && { date }),
      ...(hours !== undefined && { hours: parseFloat(hours) }),
      ...(description !== undefined && { description }),
      ...(timesheet.status === "Approved" && { status: "Pending" }), // Reset to pending if approved and updated
    });

    await timesheet.reload();

    // Audit log
    await createAuditLog({
      action: "UPDATE_TIMESHEET",
      entity_type: "Timesheet",
      entity_id: timesheet.id,
      user_id: req.user.id,
      user_type: req.user.role,
      user_email: req.user.email,
      ip_address: getClientIP(req),
      user_agent: getUserAgent(req),
      changes: {
        before: oldData,
        after: timesheet.toJSON(),
      },
    });

    res.json({
      message: "Timesheet updated successfully",
      timesheet,
    });
  } catch (error) {
    console.error("Update timesheet error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Delete timesheet (owner or admin)
 */
export const deleteTimesheet = async (req, res) => {
  try {
    const { id } = req.params;

    const timesheet = await Timesheet.findByPk(id);
    if (!timesheet) {
      return res.status(404).json({ error: "Timesheet entry not found" });
    }

    // Permission check
    const isAdmin = ["HR", "Executive", "System Admin"].includes(req.user.role);
    if (!isAdmin && timesheet.employee_id !== req.user.id) {
      return res.status(403).json({
        error: "You can only delete your own timesheet entries",
      });
    }

    await timesheet.destroy();

    // Audit log
    await createAuditLog({
      action: "DELETE_TIMESHEET",
      entity_type: "Timesheet",
      entity_id: parseInt(id),
      user_id: req.user.id,
      user_type: req.user.role,
      user_email: req.user.email,
      ip_address: getClientIP(req),
      user_agent: getUserAgent(req),
      changes: { deleted: timesheet.toJSON() },
    });

    res.json({
      message: "Timesheet entry deleted successfully",
    });
  } catch (error) {
    console.error("Delete timesheet error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

