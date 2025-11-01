import { Op } from "sequelize";
import Department from "../models/Department.js";
import Employee from "../models/Employee.js";
import { createAuditLog, getClientIP, getUserAgent } from "../utils/auditLogger.js";

/**
 * Get all departments
 */
export const getAllDepartments = async (req, res) => {
  try {
    const { page = 1, limit = 100, is_active, search } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (is_active !== undefined) where.is_active = is_active === "true";
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const departments = await Department.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["name", "ASC"]],
    });

    // Fetch manager details for each department
    const departmentsWithManagers = await Promise.all(
      departments.rows.map(async (dept) => {
        const deptData = dept.toJSON();
        if (dept.manager_id && dept.manager_type) {
          let manager = null;
          if (dept.manager_type === "Employee") {
            manager = await Employee.findByPk(dept.manager_id, {
              attributes: ["id", "full_name", "email"],
            });
          } else if (dept.manager_type === "HR") {
            const HR = (await import("../models/HR.js")).default;
            manager = await HR.findByPk(dept.manager_id, {
              attributes: ["id", "name", "email"],
            });
            if (manager) manager.full_name = manager.name;
          } else if (dept.manager_type === "Executive") {
            const Executive = (await import("../models/Executive.js")).default;
            manager = await Executive.findByPk(dept.manager_id, {
              attributes: ["id", "name", "email"],
            });
            if (manager) manager.full_name = manager.name;
          }
          deptData.manager = manager;
        }
        return deptData;
      })
    );

    // Audit log
    await createAuditLog({
      action: "VIEW_DEPARTMENTS",
      entity_type: "Department",
      user_id: req.user.id,
      user_type: req.user.role,
      user_email: req.user.email,
      ip_address: getClientIP(req),
      user_agent: getUserAgent(req),
      metadata: { page, limit, search },
    });

    res.json({
      departments: departmentsWithManagers,
      total: departments.count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(departments.count / limit),
    });
  } catch (error) {
    console.error("Get all departments error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Get department by ID
 */
export const getDepartmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const department = await Department.findByPk(id);

    if (!department) {
      return res.status(404).json({ error: "Department not found" });
    }

    const deptData = department.toJSON();

    // Fetch manager if exists
    if (department.manager_id && department.manager_type) {
      let manager = null;
      if (department.manager_type === "Employee") {
        manager = await Employee.findByPk(department.manager_id, {
          attributes: ["id", "full_name", "email", "role"],
        });
      } else if (department.manager_type === "HR") {
        const HR = (await import("../models/HR.js")).default;
        manager = await HR.findByPk(department.manager_id, {
          attributes: ["id", "name", "email"],
        });
        if (manager) {
          manager.full_name = manager.name;
          manager.role = "HR";
        }
      } else if (department.manager_type === "Executive") {
        const Executive = (await import("../models/Executive.js")).default;
        manager = await Executive.findByPk(department.manager_id, {
          attributes: ["id", "name", "email"],
        });
        if (manager) {
          manager.full_name = manager.name;
          manager.role = "Executive";
        }
      }
      deptData.manager = manager;
    }

    // Fetch parent department if exists
    if (department.parent_department_id) {
      const parent = await Department.findByPk(department.parent_department_id, {
        attributes: ["id", "name"],
      });
      deptData.parent = parent;
    }

    // Get department employees count
    const employeeCount = await Employee.count({
      where: { department: department.name },
    });

    res.json({
      ...deptData,
      employee_count: employeeCount,
    });
  } catch (error) {
    console.error("Get department by ID error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Create department (System Admin, Executive, HR only)
 */
export const createDepartment = async (req, res) => {
  try {
    const { name, description, manager_id, manager_type, parent_department_id } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Department name is required" });
    }

    // Check if department already exists
    const existingDept = await Department.findOne({ where: { name } });
    if (existingDept) {
      return res.status(400).json({ error: "Department with this name already exists" });
    }

    // Validate manager if provided
    if (manager_id) {
      if (!manager_type) {
        return res.status(400).json({ error: "Manager type is required when manager_id is provided" });
      }

      let manager;
      if (manager_type === "Employee") {
        manager = await Employee.findByPk(manager_id);
      } else if (manager_type === "HR") {
        const HR = (await import("../models/HR.js")).default;
        manager = await HR.findByPk(manager_id);
      } else if (manager_type === "Executive") {
        const Executive = (await import("../models/Executive.js")).default;
        manager = await Executive.findByPk(manager_id);
      }

      if (!manager) {
        return res.status(404).json({ error: "Manager not found" });
      }
    }

    const department = await Department.create({
      name,
      description,
      manager_id,
      manager_type,
      parent_department_id,
      created_by: req.user.id,
      is_active: true,
    });

    // Audit log
    await createAuditLog({
      action: "CREATE_DEPARTMENT",
      entity_type: "Department",
      entity_id: department.id,
      user_id: req.user.id,
      user_type: req.user.role,
      user_email: req.user.email,
      ip_address: getClientIP(req),
      user_agent: getUserAgent(req),
      changes: { created: department.toJSON() },
    });

    res.status(201).json({
      message: "Department created successfully",
      department,
    });
  } catch (error) {
    console.error("Create department error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Update department (System Admin, Executive, HR only)
 */
export const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, manager_id, manager_type, parent_department_id, is_active } = req.body;

    const department = await Department.findByPk(id);
    if (!department) {
      return res.status(404).json({ error: "Department not found" });
    }

    const oldData = { ...department.toJSON() };

    // Check name uniqueness if changing
    if (name && name !== department.name) {
      const existingDept = await Department.findOne({ where: { name } });
      if (existingDept) {
        return res.status(400).json({ error: "Department with this name already exists" });
      }
    }

    // Validate manager if provided
    if (manager_id) {
      if (!manager_type) {
        return res.status(400).json({ error: "Manager type is required when manager_id is provided" });
      }

      let manager;
      if (manager_type === "Employee") {
        manager = await Employee.findByPk(manager_id);
      } else if (manager_type === "HR") {
        const HR = (await import("../models/HR.js")).default;
        manager = await HR.findByPk(manager_id);
      } else if (manager_type === "Executive") {
        const Executive = (await import("../models/Executive.js")).default;
        manager = await Executive.findByPk(manager_id);
      }

      if (!manager) {
        return res.status(404).json({ error: "Manager not found" });
      }
    }

    await department.update({
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(manager_id !== undefined && { manager_id }),
      ...(manager_type !== undefined && { manager_type }),
      ...(parent_department_id !== undefined && { parent_department_id }),
      ...(is_active !== undefined && { is_active }),
    });

    await department.reload();

    // Audit log
    await createAuditLog({
      action: "UPDATE_DEPARTMENT",
      entity_type: "Department",
      entity_id: department.id,
      user_id: req.user.id,
      user_type: req.user.role,
      user_email: req.user.email,
      ip_address: getClientIP(req),
      user_agent: getUserAgent(req),
      changes: {
        before: oldData,
        after: department.toJSON(),
      },
    });

    res.json({
      message: "Department updated successfully",
      department,
    });
  } catch (error) {
    console.error("Update department error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Delete department (System Admin only)
 */
export const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    const department = await Department.findByPk(id);
    if (!department) {
      return res.status(404).json({ error: "Department not found" });
    }

    // Check if department has employees
    const employeeCount = await Employee.count({
      where: { department: department.name },
    });

    if (employeeCount > 0) {
      return res.status(400).json({
        error: "Cannot delete department with employees. Please reassign employees first.",
        employee_count: employeeCount,
      });
    }

    await department.destroy();

    // Audit log
    await createAuditLog({
      action: "DELETE_DEPARTMENT",
      entity_type: "Department",
      entity_id: parseInt(id),
      user_id: req.user.id,
      user_type: req.user.role,
      user_email: req.user.email,
      ip_address: getClientIP(req),
      user_agent: getUserAgent(req),
      changes: { deleted: department.toJSON() },
    });

    res.json({
      message: "Department deleted successfully",
    });
  } catch (error) {
    console.error("Delete department error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Get department hierarchy tree
 */
export const getDepartmentHierarchy = async (req, res) => {
  try {
    const departments = await Department.findAll({
      where: { is_active: true },
      order: [["name", "ASC"]],
    });

    // Fetch manager and parent for each department
    const departmentsWithRelations = await Promise.all(
      departments.map(async (dept) => {
        const deptData = dept.toJSON();
        
        // Fetch parent if exists
        if (dept.parent_department_id) {
          const parent = await Department.findByPk(dept.parent_department_id, {
            attributes: ["id", "name"],
          });
          deptData.parent = parent;
        }

        // Fetch manager if exists
        if (dept.manager_id && dept.manager_type) {
          let manager = null;
          if (dept.manager_type === "Employee") {
            manager = await Employee.findByPk(dept.manager_id, {
              attributes: ["id", "full_name", "email"],
            });
          } else if (dept.manager_type === "HR") {
            const HR = (await import("../models/HR.js")).default;
            manager = await HR.findByPk(dept.manager_id, {
              attributes: ["id", "name", "email"],
            });
            if (manager) manager.full_name = manager.name;
          } else if (dept.manager_type === "Executive") {
            const Executive = (await import("../models/Executive.js")).default;
            manager = await Executive.findByPk(dept.manager_id, {
              attributes: ["id", "name", "email"],
            });
            if (manager) manager.full_name = manager.name;
          }
          deptData.manager = manager;
        }

        return deptData;
      })
    );

    // Build hierarchy tree
    const buildTree = (depts, parentId = null) => {
      return depts
        .filter((dept) => (dept.parent_department_id === parentId) || (parentId === null && !dept.parent_department_id))
        .map((dept) => ({
          ...dept,
          children: buildTree(depts, dept.id),
        }));
    };

    const tree = buildTree(departmentsWithRelations);

    res.json({
      hierarchy: tree,
      total_departments: departments.length,
    });
  } catch (error) {
    console.error("Get department hierarchy error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

