import { Op } from "sequelize";
import Employee from "../models/Employee.js";
import HR from "../models/HR.js";
import Executive from "../models/Executive.js";
import Department from "../models/Department.js";

/**
 * Get team hierarchy - reporting structure
 */
export const getTeamHierarchy = async (req, res) => {
  try {
    const { employee_id, department } = req.query;

    let rootEmployee;

    if (employee_id) {
      rootEmployee = await Employee.findByPk(employee_id);
      if (!rootEmployee) {
        return res.status(404).json({ error: "Employee not found" });
      }
    } else {
      // Get current user's hierarchy
      rootEmployee = await Employee.findByPk(req.user.id);
    }

    // Build hierarchy tree
    const buildHierarchy = async (employeeId) => {
      const employee = await Employee.findByPk(employeeId, {
        attributes: { exclude: ["password"] },
      });

      if (!employee) return null;

      // Find direct reports (employees who have this employee as manager)
      const directReports = await Employee.findAll({
        where: {
          manager_id: employeeId,
          is_active: true,
        },
        attributes: { exclude: ["password"] },
        order: [["full_name", "ASC"]],
      });

      // Recursively build hierarchy for each direct report
      const reports = await Promise.all(
        directReports.map(async (report) => await buildHierarchy(report.id))
      );

      return {
        ...employee.toJSON(),
        direct_reports: reports.filter((r) => r !== null),
        reports_count: directReports.length,
      };
    };

    const hierarchy = await buildHierarchy(rootEmployee.id);

    res.json({
      hierarchy,
      employee: {
        id: rootEmployee.id,
        name: rootEmployee.full_name,
        email: rootEmployee.email,
        department: rootEmployee.department,
        role: rootEmployee.role,
      },
    });
  } catch (error) {
    console.error("Get team hierarchy error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Get department team structure
 */
export const getDepartmentTeam = async (req, res) => {
  try {
    const { department_name } = req.query;

    if (!department_name) {
      return res.status(400).json({ error: "Department name is required" });
    }

    // Get department info
    const department = await Department.findOne({
      where: { name: department_name, is_active: true },
    });

    // Get all employees in department
    const employees = await Employee.findAll({
      where: {
        department: department_name,
        is_active: true,
      },
      attributes: { exclude: ["password"] },
      order: [["full_name", "ASC"]],
    });

    // Build hierarchy for department
    const managers = employees.filter((emp) => !emp.manager_id);
    const employeesByManager = {};

    employees.forEach((emp) => {
      if (emp.manager_id) {
        if (!employeesByManager[emp.manager_id]) {
          employeesByManager[emp.manager_id] = [];
        }
        employeesByManager[emp.manager_id].push(emp);
      }
    });

    const buildTeamTree = (manager) => {
      return {
        ...manager.toJSON(),
        team_members: (employeesByManager[manager.id] || []).map((member) => ({
          ...member.toJSON(),
          team_members: buildTeamTree(member).team_members,
        })),
      };
    };

    const teamStructure = managers.map((manager) => buildTeamTree(manager));

    res.json({
      department: department
        ? {
            id: department.id,
            name: department.name,
            description: department.description,
            manager_id: department.manager_id,
          }
        : null,
      team_structure: teamStructure,
      total_employees: employees.length,
      total_managers: managers.length,
    });
  } catch (error) {
    console.error("Get department team error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Get organization chart - complete hierarchy
 */
export const getOrgChart = async (req, res) => {
  try {
    // Get all active employees
    const allEmployees = await Employee.findAll({
      where: { is_active: true },
      attributes: { exclude: ["password"] },
      order: [["full_name", "ASC"]],
    });

    // Build complete org chart
    const employeesById = {};
    allEmployees.forEach((emp) => {
      employeesById[emp.id] = {
        ...emp.toJSON(),
        direct_reports: [],
      };
    });

    // Build relationships
    allEmployees.forEach((emp) => {
      if (emp.manager_id && employeesById[emp.manager_id]) {
        employeesById[emp.manager_id].direct_reports.push(employeesById[emp.id]);
      }
    });

    // Find root nodes (no manager)
    const rootNodes = Object.values(employeesById).filter((emp) => !emp.manager_id);

    // Get departments
    const departments = await Department.findAll({
      where: { is_active: true },
      attributes: ["id", "name", "description", "manager_id"],
    });

    res.json({
      org_chart: rootNodes,
      departments: departments,
      total_employees: allEmployees.length,
      total_departments: departments.length,
    });
  } catch (error) {
    console.error("Get org chart error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

