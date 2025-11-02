import Employee from "../models/Employee.js";
import { sendPayrollEmail } from "../utils/emailUtils.js";

/**
 * Get all payroll records (HR/Executive/System Admin only)
 */
export const getAllPayrolls = async (req, res) => {
  try {
    const { page = 1, limit = 10, employee_id, month, year } = req.query;
    const offset = (page - 1) * limit;

    // In a real system, you'd have a Payroll table
    // For now, we'll return employee salary information
    const where = {};
    if (employee_id) where.id = employee_id;

    const employees = await Employee.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      attributes: [
        "id",
        "full_name",
        "email",
        "department",
        "current_salary",
        "bonus",
        "role",
      ],
    });

    // Calculate total for each employee
    const payrolls = employees.rows.map((employee) => ({
      employee_id: employee.id,
      employee_name: employee.full_name,
      email: employee.email,
      department: employee.department,
      salary: employee.current_salary,
      bonus: employee.bonus,
      total: parseFloat(employee.current_salary) + parseFloat(employee.bonus || 0),
      period: `${month || new Date().getMonth() + 1}/${year || new Date().getFullYear()}`,
    }));

    res.json({
      payrolls,
      total: employees.count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(employees.count / limit),
    });
  } catch (error) {
    console.error("Get all payrolls error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Get payroll for specific employee
 */
export const getEmployeePayroll = async (req, res) => {
  try {
    const { employee_id } = req.params;
    const { month, year } = req.query;

    const employee = await Employee.findByPk(employee_id, {
      attributes: [
        "id",
        "full_name",
        "email",
        "department",
        "current_salary",
        "bonus",
        "role",
      ],
    });

    if (!employee) {
      return res.status(404).json({
        error: "Not found",
        message: "Employee not found",
      });
    }

    // Check permissions
    const isAdmin = ["System Admin", "HR", "Executive"].includes(req.user.role);
    const isOwner = req.user.id === parseInt(employee_id);

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You don't have permission to view this payroll",
      });
    }

    const payroll = {
      employee_id: employee.id,
      employee_name: employee.full_name,
      email: employee.email,
      department: employee.department,
      salary: employee.current_salary,
      bonus: employee.bonus || 0,
      total: parseFloat(employee.current_salary) + parseFloat(employee.bonus || 0),
      period: `${month || new Date().getMonth() + 1}/${year || new Date().getFullYear()}`,
    };

    res.json({
      payroll,
    });
  } catch (error) {
    console.error("Get employee payroll error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Update employee payroll (HR/System Admin only)
 */
export const updatePayroll = async (req, res) => {
  try {
    const { employee_id } = req.params;
    const { salary, bonus } = req.body;

    if (salary === undefined && bonus === undefined) {
      return res.status(400).json({
        error: "Validation error",
        message: "Salary or bonus is required",
      });
    }

    const employee = await Employee.findByPk(employee_id);
    if (!employee) {
      return res.status(404).json({
        error: "Not found",
        message: "Employee not found",
      });
    }

    if (salary !== undefined) {
      employee.current_salary = salary;
    }
    if (bonus !== undefined) {
      employee.bonus = bonus;
    }

    await employee.save();

    // Send notification email
    try {
      await sendPayrollEmail(employee.email, employee.full_name, {
        salary: employee.current_salary,
        bonus: employee.bonus || 0,
        total: parseFloat(employee.current_salary) + parseFloat(employee.bonus || 0),
        period: `${new Date().getMonth() + 1}/${new Date().getFullYear()}`,
      });
    } catch (emailError) {
      console.error("Failed to send payroll email:", emailError);
    }

    const { password: _, ...employeeResponse } = employee.toJSON();

    res.json({
      message: "Payroll updated successfully",
      employee: employeeResponse,
    });
  } catch (error) {
    console.error("Update payroll error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Process payroll for all employees (HR/System Admin only)
 */
export const processPayroll = async (req, res) => {
  try {
    const { month, year } = req.body;
    const period = `${month || new Date().getMonth() + 1}/${year || new Date().getFullYear()}`;

    const employees = await Employee.findAll({
      where: { is_active: true },
      attributes: [
        "id",
        "full_name",
        "email",
        "current_salary",
        "bonus",
      ],
    });

    const payrolls = employees.map((employee) => ({
      employee_id: employee.id,
      employee_name: employee.full_name,
      salary: employee.current_salary,
      bonus: employee.bonus || 0,
      total: parseFloat(employee.current_salary) + parseFloat(employee.bonus || 0),
      period,
    }));

    // Send notifications
    const notifications = await Promise.allSettled(
      employees.map((employee) =>
        sendPayrollEmail(employee.email, employee.full_name, {
          salary: employee.current_salary,
          bonus: employee.bonus || 0,
          total: parseFloat(employee.current_salary) + parseFloat(employee.bonus || 0),
          period,
        })
      )
    );

    const successCount = notifications.filter((n) => n.status === "fulfilled").length;
    const failureCount = notifications.filter((n) => n.status === "rejected").length;

    res.json({
      message: "Payroll processed successfully",
      totalEmployees: employees.length,
      payrolls,
      notifications: {
        sent: successCount,
        failed: failureCount,
      },
    });
  } catch (error) {
    console.error("Process payroll error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

