import { Op } from "sequelize";
import Project from "../models/Project.js";
import Employee from "../models/Employee.js";
import Task from "../models/Task.js";
import { createAuditLog, getClientIP, getUserAgent } from "../utils/auditLogger.js";

/**
 * Get all projects
 */
export const getAllProjects = async (req, res) => {
  try {
    const { status, department, priority, search, is_active } = req.query;

    const where = {};
    if (status) where.status = status;
    if (department) where.department = department;
    if (priority) where.priority = priority;
    if (is_active !== undefined) where.is_active = is_active === "true";
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const projects = await Project.findAll({
      where,
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: Employee,
          as: "projectManager",
          attributes: ["id", "full_name", "email"],
          required: false,
        },
      ],
    });

    // Get task counts for each project
    const projectsWithStats = await Promise.all(
      projects.map(async (project) => {
        const projectData = project.toJSON();
        
        // Count tasks by status
        const tasks = await Task.findAll({
          where: { project_id: project.id },
        });

        projectData.total_tasks = tasks.length;
        projectData.tasks_todo = tasks.filter((t) => t.status === "To Do").length;
        projectData.tasks_in_progress = tasks.filter((t) => t.status === "In Progress").length;
        projectData.tasks_done = tasks.filter((t) => t.status === "Done").length;
        projectData.tasks_blocked = tasks.filter((t) => t.status === "Blocked").length;

        // Calculate overall progress
        if (tasks.length > 0) {
          const totalProgress = tasks.reduce((sum, task) => sum + (task.progress || 0), 0);
          projectData.overall_progress = Math.round(totalProgress / tasks.length);
        } else {
          projectData.overall_progress = 0;
        }

        return projectData;
      })
    );

    res.json({
      projects: projectsWithStats,
      total: projectsWithStats.length,
    });
  } catch (error) {
    console.error("Get all projects error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Get project by ID
 */
export const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findByPk(id, {
      include: [
        {
          model: Employee,
          as: "projectManager",
          attributes: ["id", "full_name", "email", "department"],
          required: false,
        },
      ],
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Get all tasks for this project
    const tasks = await Task.findAll({
      where: { project_id: id },
      include: [
        {
          model: Employee,
          as: "assignedEmployee",
          attributes: ["id", "full_name", "email"],
          required: false,
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const projectData = project.toJSON();
    projectData.tasks = tasks;

    res.json({ project: projectData });
  } catch (error) {
    console.error("Get project by ID error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Create project (HR/Executive/System Admin only)
 */
export const createProject = async (req, res) => {
  try {
    const {
      name,
      description,
      department,
      project_manager_id,
      status,
      priority,
      start_date,
      end_date,
      budget,
    } = req.body;

    if (!name) {
      return res.status(400).json({
        error: "Project name is required",
      });
    }

    // Validate project manager if provided
    if (project_manager_id) {
      const manager = await Employee.findByPk(project_manager_id);
      if (!manager) {
        return res.status(404).json({ error: "Project manager not found" });
      }
    }

    const project = await Project.create({
      name,
      description,
      department,
      project_manager_id,
      status: status || "Planning",
      priority: priority || "Medium",
      start_date: start_date || null,
      end_date: end_date || null,
      budget: budget || null,
      created_by: req.user.id,
      created_by_type: req.user.role,
      is_active: true,
    });

    // Audit log
    await createAuditLog({
      action: "CREATE_PROJECT",
      entity_type: "Project",
      entity_id: project.id,
      user_id: req.user.id,
      user_type: req.user.role,
      user_email: req.user.email,
      ip_address: getClientIP(req),
      user_agent: getUserAgent(req),
      changes: { created: project.toJSON() },
    });

    res.status(201).json({
      message: "Project created successfully",
      project,
    });
  } catch (error) {
    console.error("Create project error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Update project (HR/Executive/System Admin only)
 */
export const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      department,
      project_manager_id,
      status,
      priority,
      start_date,
      end_date,
      budget,
      is_active,
    } = req.body;

    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const oldData = { ...project.toJSON() };

    // Validate project manager if provided
    if (project_manager_id) {
      const manager = await Employee.findByPk(project_manager_id);
      if (!manager) {
        return res.status(404).json({ error: "Project manager not found" });
      }
    }

    await project.update({
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(department !== undefined && { department }),
      ...(project_manager_id !== undefined && { project_manager_id }),
      ...(status && { status }),
      ...(priority && { priority }),
      ...(start_date !== undefined && { start_date }),
      ...(end_date !== undefined && { end_date }),
      ...(budget !== undefined && { budget }),
      ...(is_active !== undefined && { is_active }),
    });

    await project.reload();

    // Audit log
    await createAuditLog({
      action: "UPDATE_PROJECT",
      entity_type: "Project",
      entity_id: project.id,
      user_id: req.user.id,
      user_type: req.user.role,
      user_email: req.user.email,
      ip_address: getClientIP(req),
      user_agent: getUserAgent(req),
      changes: {
        before: oldData,
        after: project.toJSON(),
      },
    });

    res.json({
      message: "Project updated successfully",
      project,
    });
  } catch (error) {
    console.error("Update project error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Delete project (HR/Executive/System Admin only)
 */
export const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Check if project has tasks
    const taskCount = await Task.count({
      where: { project_id: id },
    });

    if (taskCount > 0) {
      return res.status(400).json({
        error: "Cannot delete project with tasks. Please delete or reassign tasks first.",
        task_count: taskCount,
      });
    }

    await project.destroy();

    // Audit log
    await createAuditLog({
      action: "DELETE_PROJECT",
      entity_type: "Project",
      entity_id: parseInt(id),
      user_id: req.user.id,
      user_type: req.user.role,
      user_email: req.user.email,
      ip_address: getClientIP(req),
      user_agent: getUserAgent(req),
      changes: { deleted: project.toJSON() },
    });

    res.json({
      message: "Project deleted successfully",
    });
  } catch (error) {
    console.error("Delete project error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

