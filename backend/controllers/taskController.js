import { Op } from "sequelize";
import Task from "../models/Task.js";
import Project from "../models/Project.js";
import Employee from "../models/Employee.js";
import { createAuditLog, getClientIP, getUserAgent } from "../utils/auditLogger.js";

/**
 * Get all tasks
 */
export const getAllTasks = async (req, res) => {
  try {
    const { project_id, assigned_to, status, priority, search } = req.query;

    const where = {};

    if (project_id) where.project_id = project_id;
    if (assigned_to) where.assigned_to = assigned_to;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
      ];
    }

    // Employees can only see tasks assigned to them or in their projects
    if (!["HR", "Executive", "System Admin"].includes(req.user.role)) {
      where[Op.or] = [
        { assigned_to: req.user.id },
        { assigned_to: null }, // Unassigned tasks visible to all in project
      ];
    }

    const tasks = await Task.findAll({
      where,
      include: [
        {
          model: Project,
          attributes: ["id", "name", "status"],
          required: false,
        },
        {
          model: Employee,
          as: "assignedEmployee",
          attributes: ["id", "full_name", "email"],
          required: false,
        },
        {
          model: Employee,
          as: "assignedByEmployee",
          attributes: ["id", "full_name", "email"],
          required: false,
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json({
      tasks,
      total: tasks.length,
    });
  } catch (error) {
    console.error("Get all tasks error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Get task by ID
 */
export const getTaskById = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findByPk(id, {
      include: [
        {
          model: Project,
          attributes: ["id", "name", "status", "description"],
          required: false,
        },
        {
          model: Employee,
          as: "assignedEmployee",
          attributes: ["id", "full_name", "email", "department"],
          required: false,
        },
        {
          model: Employee,
          as: "assignedByEmployee",
          attributes: ["id", "full_name", "email"],
          required: false,
        },
      ],
    });

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    // Permission check: Employee can only see tasks assigned to them
    if (!["HR", "Executive", "System Admin"].includes(req.user.role)) {
      if (task.assigned_to !== req.user.id) {
        return res.status(403).json({
          error: "You don't have permission to view this task",
        });
      }
    }

    res.json({ task });
  } catch (error) {
    console.error("Get task by ID error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Create task (HR/Executive/System Admin or Project Manager)
 */
export const createTask = async (req, res) => {
  try {
    const {
      project_id,
      title,
      description,
      assigned_to,
      priority,
      due_date,
      estimated_hours,
    } = req.body;

    if (!project_id || !title) {
      return res.status(400).json({
        error: "Project ID and title are required",
      });
    }

    // Check if project exists
    const project = await Project.findByPk(project_id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Validate assigned employee if provided
    if (assigned_to) {
      const employee = await Employee.findByPk(assigned_to);
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }
    }

    const task = await Task.create({
      project_id,
      title,
      description,
      assigned_to: assigned_to || null,
      assigned_by: req.user.id,
      status: "To Do",
      priority: priority || "Medium",
      due_date: due_date || null,
      estimated_hours: estimated_hours || null,
      actual_hours: 0,
      progress: 0,
    });

    // Audit log
    await createAuditLog({
      action: "CREATE_TASK",
      entity_type: "Task",
      entity_id: task.id,
      user_id: req.user.id,
      user_type: req.user.role,
      user_email: req.user.email,
      ip_address: getClientIP(req),
      user_agent: getUserAgent(req),
      changes: { created: task.toJSON() },
    });

    res.status(201).json({
      message: "Task created successfully",
      task,
    });
  } catch (error) {
    console.error("Create task error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Update task
 */
export const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      assigned_to,
      status,
      priority,
      due_date,
      estimated_hours,
      actual_hours,
      progress,
    } = req.body;

    const task = await Task.findByPk(id);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    // Permission check: Employee can only update tasks assigned to them
    const isAdmin = ["HR", "Executive", "System Admin"].includes(req.user.role);
    const isAssigned = task.assigned_to === req.user.id;

    if (!isAdmin && !isAssigned) {
      return res.status(403).json({
        error: "You don't have permission to update this task",
      });
    }

    // Only admins can change assignment and certain fields
    if (!isAdmin && assigned_to !== undefined) {
      return res.status(403).json({
        error: "Only admins can change task assignment",
      });
    }

    const oldData = { ...task.toJSON() };

    // Validate assigned employee if changing
    if (assigned_to && assigned_to !== task.assigned_to) {
      const employee = await Employee.findByPk(assigned_to);
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }
    }

    await task.update({
      ...(title && { title }),
      ...(description !== undefined && { description }),
      ...(isAdmin && assigned_to !== undefined && { assigned_to }),
      ...(status && { status }),
      ...(priority && { priority }),
      ...(due_date !== undefined && { due_date }),
      ...(estimated_hours !== undefined && { estimated_hours }),
      ...(actual_hours !== undefined && { actual_hours }),
      ...(progress !== undefined && { progress }),
    });

    await task.reload();

    // Audit log
    await createAuditLog({
      action: "UPDATE_TASK",
      entity_type: "Task",
      entity_id: task.id,
      user_id: req.user.id,
      user_type: req.user.role,
      user_email: req.user.email,
      ip_address: getClientIP(req),
      user_agent: getUserAgent(req),
      changes: {
        before: oldData,
        after: task.toJSON(),
      },
    });

    res.json({
      message: "Task updated successfully",
      task,
    });
  } catch (error) {
    console.error("Update task error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Delete task (HR/Executive/System Admin only)
 */
export const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findByPk(id);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    await task.destroy();

    // Audit log
    await createAuditLog({
      action: "DELETE_TASK",
      entity_type: "Task",
      entity_id: parseInt(id),
      user_id: req.user.id,
      user_type: req.user.role,
      user_email: req.user.email,
      ip_address: getClientIP(req),
      user_agent: getUserAgent(req),
      changes: { deleted: task.toJSON() },
    });

    res.json({
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("Delete task error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

