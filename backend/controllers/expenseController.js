import { Op } from "sequelize";
import Expense from "../models/Expense.js";
import Employee from "../models/Employee.js";
import { createAuditLog, getClientIP, getUserAgent } from "../utils/auditLogger.js";

/**
 * Submit expense (all employees)
 */
export const submitExpense = async (req, res) => {
  try {
    const { category, amount, date, description, receipt_url } = req.body;
    const employee_id = req.user.id;

    if (!category || !amount || !date || !description) {
      return res.status(400).json({
        error: "Category, amount, date, and description are required",
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        error: "Amount must be greater than 0",
      });
    }

    const expense = await Expense.create({
      employee_id,
      category,
      amount: parseFloat(amount),
      date,
      description,
      receipt_url: receipt_url || null,
      status: "Pending",
    });

    // Audit log
    await createAuditLog({
      action: "SUBMIT_EXPENSE",
      entity_type: "Expense",
      entity_id: expense.id,
      user_id: req.user.id,
      user_type: req.user.role,
      user_email: req.user.email,
      ip_address: getClientIP(req),
      user_agent: getUserAgent(req),
      changes: { created: expense.toJSON() },
    });

    res.status(201).json({
      message: "Expense submitted successfully",
      expense,
    });
  } catch (error) {
    console.error("Submit expense error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Get expenses
 */
export const getExpenses = async (req, res) => {
  try {
    const { employee_id, status, category, start_date, end_date } = req.query;
    const queryEmployeeId = employee_id || req.user.id;

    // Permission check
    if (employee_id && employee_id != req.user.id) {
      if (!["HR", "Executive", "System Admin"].includes(req.user.role)) {
        return res.status(403).json({
          error: "You don't have permission to view this expense",
        });
      }
    }

    const where = { employee_id: queryEmployeeId };

    if (status) where.status = status;
    if (category) where.category = category;
    if (start_date && end_date) {
      where.date = {
        [Op.between]: [start_date, end_date],
      };
    }

    const expenses = await Expense.findAll({
      where,
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: Employee,
          attributes: ["id", "full_name", "email", "department"],
        },
      ],
    });

    res.json({
      expenses,
      total: expenses.length,
    });
  } catch (error) {
    console.error("Get expenses error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Approve expense (HR/Executive/System Admin only)
 */
export const approveExpense = async (req, res) => {
  try {
    const { id } = req.params;

    const expense = await Expense.findByPk(id);
    if (!expense) {
      return res.status(404).json({ error: "Expense not found" });
    }

    if (expense.status !== "Pending") {
      return res.status(400).json({
        error: `Expense is already ${expense.status}`,
      });
    }

    const oldData = { ...expense.toJSON() };

    await expense.update({
      status: "Approved",
      approved_by: req.user.id,
      approved_by_type: req.user.role,
      approved_at: new Date(),
    });

    await expense.reload();

    // Audit log
    await createAuditLog({
      action: "APPROVE_EXPENSE",
      entity_type: "Expense",
      entity_id: expense.id,
      user_id: req.user.id,
      user_type: req.user.role,
      user_email: req.user.email,
      ip_address: getClientIP(req),
      user_agent: getUserAgent(req),
      changes: {
        before: oldData,
        after: expense.toJSON(),
      },
    });

    res.json({
      message: "Expense approved successfully",
      expense,
    });
  } catch (error) {
    console.error("Approve expense error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Reject expense (HR/Executive/System Admin only)
 */
export const rejectExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejection_reason } = req.body;

    if (!rejection_reason) {
      return res.status(400).json({
        error: "Rejection reason is required",
      });
    }

    const expense = await Expense.findByPk(id);
    if (!expense) {
      return res.status(404).json({ error: "Expense not found" });
    }

    if (expense.status !== "Pending") {
      return res.status(400).json({
        error: `Expense is already ${expense.status}`,
      });
    }

    const oldData = { ...expense.toJSON() };

    await expense.update({
      status: "Rejected",
      approved_by: req.user.id,
      approved_by_type: req.user.role,
      approved_at: new Date(),
      rejection_reason,
    });

    await expense.reload();

    // Audit log
    await createAuditLog({
      action: "REJECT_EXPENSE",
      entity_type: "Expense",
      entity_id: expense.id,
      user_id: req.user.id,
      user_type: req.user.role,
      user_email: req.user.email,
      ip_address: getClientIP(req),
      user_agent: getUserAgent(req),
      changes: {
        before: oldData,
        after: expense.toJSON(),
      },
    });

    res.json({
      message: "Expense rejected",
      expense,
    });
  } catch (error) {
    console.error("Reject expense error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

