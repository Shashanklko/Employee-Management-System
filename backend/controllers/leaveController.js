import { Op } from "sequelize";
import Leave from "../models/Leave.js";
import Employee from "../models/Employee.js";
import { createAuditLog, getClientIP, getUserAgent } from "../utils/auditLogger.js";

/**
 * Calculate business days between two dates (excluding weekends)
 */
const calculateBusinessDays = (startDate, endDate) => {
  let count = 0;
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      // Not Sunday (0) or Saturday (6)
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
};

/**
 * Apply for leave
 */
export const applyLeave = async (req, res) => {
  try {
    const { leave_type, start_date, end_date, reason } = req.body;
    const employee_id = req.user.id;

    if (!leave_type || !start_date || !end_date) {
      return res.status(400).json({
        error: "Leave type, start date, and end date are required",
      });
    }

    // Validate dates
    const start = new Date(start_date);
    const end = new Date(end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today) {
      return res.status(400).json({
        error: "Start date cannot be in the past",
      });
    }

    if (end < start) {
      return res.status(400).json({
        error: "End date must be after start date",
      });
    }

    // Calculate total days
    const totalDays = calculateBusinessDays(start_date, end_date);

    if (totalDays <= 0) {
      return res.status(400).json({
        error: "Invalid date range",
      });
    }

    // Check leave balance
    const currentYear = new Date(start_date).getFullYear();
    let leaveBalance = await LeaveBalance.findOne({
      where: {
        employee_id,
        year: currentYear,
        leave_type,
      },
    });

    if (!leaveBalance) {
      // Initialize leave balance if doesn't exist
      const defaultAllocation = {
        "Sick Leave": 12,
        "Casual Leave": 12,
        "Earned Leave": 15,
        "Compensatory Off": 0,
        "Maternity Leave": 180,
        "Paternity Leave": 7,
        "Bereavement Leave": 5,
        "Unpaid Leave": 999, // Unlimited
      };

      leaveBalance = await LeaveBalance.create({
        employee_id,
        year: currentYear,
        leave_type,
        total_allocated: defaultAllocation[leave_type] || 0,
        used: 0,
        pending: 0,
        balance: defaultAllocation[leave_type] || 0,
      });
    }

    // Check if sufficient balance (including pending)
    const availableBalance = leaveBalance.balance - leaveBalance.pending;
    const isExtraLeave = availableBalance < totalDays && leave_type !== "Unpaid Leave";
    
    // Allow extra leave but flag it (HR/Admin can approve extra leaves)
    if (isExtraLeave) {
      // Warning but allow submission - will be flagged as extra leave
      console.warn(`Extra leave requested: Available ${availableBalance}, Requested ${totalDays}`);
    }

    // Check for overlapping leaves
    const overlappingLeave = await Leave.findOne({
      where: {
        employee_id,
        status: {
          [Op.in]: ["Pending", "Approved"],
        },
        [Op.or]: [
          {
            start_date: {
              [Op.between]: [start_date, end_date],
            },
          },
          {
            end_date: {
              [Op.between]: [start_date, end_date],
            },
          },
          {
            [Op.and]: [
              { start_date: { [Op.lte]: start_date } },
              { end_date: { [Op.gte]: end_date } },
            ],
          },
        ],
      },
    });

    if (overlappingLeave) {
      return res.status(400).json({
        error: "You already have a leave application for this period",
        conflicting_leave: overlappingLeave,
      });
    }

    const leave = await Leave.create({
      employee_id,
      leave_type,
      start_date,
      end_date,
      total_days: totalDays,
      reason,
      applied_by: employee_id,
      status: "Pending",
      is_extra_leave: isExtraLeave,
    });

    // Update leave balance - add to pending
    leaveBalance.pending += totalDays;
    leaveBalance.balance = leaveBalance.total_allocated - leaveBalance.used - leaveBalance.pending;
    await leaveBalance.save();

    // Audit log
    await createAuditLog({
      action: "APPLY_LEAVE",
      entity_type: "Leave",
      entity_id: leave.id,
      user_id: req.user.id,
      user_type: req.user.role,
      user_email: req.user.email,
      ip_address: getClientIP(req),
      user_agent: getUserAgent(req),
      changes: { created: leave.toJSON() },
    });

    res.status(201).json({
      message: "Leave application submitted successfully",
      leave,
    });
  } catch (error) {
    console.error("Apply leave error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Get leave applications
 */
export const getLeaves = async (req, res) => {
  try {
    const { employee_id, status, leave_type, start_date, end_date } = req.query;
    const queryEmployeeId = employee_id || req.user.id;

    // Permission check: Employee can only view own leaves
    if (employee_id && employee_id != req.user.id) {
      if (!["HR", "Executive", "System Admin"].includes(req.user.role)) {
        return res.status(403).json({
          error: "You don't have permission to view this leave",
        });
      }
    }

    const where = { employee_id: queryEmployeeId };

    if (status) where.status = status;
    if (leave_type) where.leave_type = leave_type;
    if (start_date && end_date) {
      where[Op.or] = [
        {
          start_date: {
            [Op.between]: [start_date, end_date],
          },
        },
        {
          end_date: {
            [Op.between]: [start_date, end_date],
          },
        },
      ];
    }

    const leaves = await Leave.findAll({
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
      leaves,
      total: leaves.length,
    });
  } catch (error) {
    console.error("Get leaves error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Get leave by ID
 */
export const getLeaveById = async (req, res) => {
  try {
    const { id } = req.params;

    const leave = await Leave.findByPk(id, {
      include: [
        {
          model: Employee,
          attributes: ["id", "full_name", "email", "department"],
        },
      ],
    });

    if (!leave) {
      return res.status(404).json({ error: "Leave application not found" });
    }

    // Permission check
    if (leave.employee_id !== req.user.id) {
      if (!["HR", "Executive", "System Admin"].includes(req.user.role)) {
        return res.status(403).json({
          error: "You don't have permission to view this leave",
        });
      }
    }

    res.json({ leave });
  } catch (error) {
    console.error("Get leave by ID error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Approve leave (HR/Executive/System Admin only)
 */
export const approveLeave = async (req, res) => {
  try {
    const { id } = req.params;

    const leave = await Leave.findByPk(id);
    if (!leave) {
      return res.status(404).json({ error: "Leave application not found" });
    }

    if (leave.status !== "Pending") {
      return res.status(400).json({
        error: `Leave is already ${leave.status}`,
      });
    }

    const oldData = { ...leave.toJSON() };

    await leave.update({
      status: "Approved",
      approved_by: req.user.id,
      approved_by_type: req.user.role,
      approved_at: new Date(),
    });

    await leave.reload();

    // Update leave balance - move from pending to used
    const currentYear = new Date(leave.start_date).getFullYear();
    let leaveBalance = await LeaveBalance.findOne({
      where: {
        employee_id: leave.employee_id,
        year: currentYear,
        leave_type: leave.leave_type,
      },
    });

    if (leaveBalance) {
      leaveBalance.pending -= leave.total_days;
      leaveBalance.used += leave.total_days;
      leaveBalance.balance = leaveBalance.total_allocated - leaveBalance.used - leaveBalance.pending;
      await leaveBalance.save();
    } else {
      // Create balance record if doesn't exist
      leaveBalance = await LeaveBalance.create({
        employee_id: leave.employee_id,
        year: currentYear,
        leave_type: leave.leave_type,
        total_allocated: 0,
        used: leave.total_days,
        pending: 0,
        balance: -leave.total_days, // Negative balance for extra leave
      });
    }

    // Audit log
    await createAuditLog({
      action: "APPROVE_LEAVE",
      entity_type: "Leave",
      entity_id: leave.id,
      user_id: req.user.id,
      user_type: req.user.role,
      user_email: req.user.email,
      ip_address: getClientIP(req),
      user_agent: getUserAgent(req),
      changes: {
        before: oldData,
        after: leave.toJSON(),
      },
    });

    res.json({
      message: "Leave approved successfully",
      leave,
    });
  } catch (error) {
    console.error("Approve leave error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Reject leave (HR/Executive/System Admin only)
 */
export const rejectLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejection_reason } = req.body;

    if (!rejection_reason) {
      return res.status(400).json({
        error: "Rejection reason is required",
      });
    }

    const leave = await Leave.findByPk(id);
    if (!leave) {
      return res.status(404).json({ error: "Leave application not found" });
    }

    if (leave.status !== "Pending") {
      return res.status(400).json({
        error: `Leave is already ${leave.status}`,
      });
    }

    const oldData = { ...leave.toJSON() };

    await leave.update({
      status: "Rejected",
      approved_by: req.user.id,
      approved_by_type: req.user.role,
      approved_at: new Date(),
      rejection_reason,
    });

    await leave.reload();

    // Update leave balance - remove from pending
    const currentYear = new Date(leave.start_date).getFullYear();
    const leaveBalance = await LeaveBalance.findOne({
      where: {
        employee_id: leave.employee_id,
        year: currentYear,
        leave_type: leave.leave_type,
      },
    });

    if (leaveBalance) {
      leaveBalance.pending -= leave.total_days;
      leaveBalance.balance = leaveBalance.total_allocated - leaveBalance.used - leaveBalance.pending;
      await leaveBalance.save();
    }

    // Audit log
    await createAuditLog({
      action: "REJECT_LEAVE",
      entity_type: "Leave",
      entity_id: leave.id,
      user_id: req.user.id,
      user_type: req.user.role,
      user_email: req.user.email,
      ip_address: getClientIP(req),
      user_agent: getUserAgent(req),
      changes: {
        before: oldData,
        after: leave.toJSON(),
      },
    });

    res.json({
      message: "Leave rejected",
      leave,
    });
  } catch (error) {
    console.error("Reject leave error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Cancel leave (by employee)
 */
export const cancelLeave = async (req, res) => {
  try {
    const { id } = req.params;

    const leave = await Leave.findByPk(id);
    if (!leave) {
      return res.status(404).json({ error: "Leave application not found" });
    }

    // Only employee can cancel their own leave
    if (leave.employee_id !== req.user.id) {
      return res.status(403).json({
        error: "You can only cancel your own leave",
      });
    }

    if (leave.status !== "Pending") {
      return res.status(400).json({
        error: `Cannot cancel leave with status: ${leave.status}`,
      });
    }

    const oldData = { ...leave.toJSON() };

    await leave.update({
      status: "Cancelled",
    });

    await leave.reload();

    // Update leave balance - remove from pending if was pending
    if (oldData.status === "Pending") {
      const currentYear = new Date(leave.start_date).getFullYear();
      const leaveBalance = await LeaveBalance.findOne({
        where: {
          employee_id: leave.employee_id,
          year: currentYear,
          leave_type: leave.leave_type,
        },
      });

      if (leaveBalance) {
        leaveBalance.pending -= leave.total_days;
        leaveBalance.balance = leaveBalance.total_allocated - leaveBalance.used - leaveBalance.pending;
        await leaveBalance.save();
      }
    }

    // Audit log
    await createAuditLog({
      action: "CANCEL_LEAVE",
      entity_type: "Leave",
      entity_id: leave.id,
      user_id: req.user.id,
      user_type: req.user.role,
      user_email: req.user.email,
      ip_address: getClientIP(req),
      user_agent: getUserAgent(req),
      changes: {
        before: oldData,
        after: leave.toJSON(),
      },
    });

    res.json({
      message: "Leave cancelled successfully",
      leave,
    });
  } catch (error) {
    console.error("Cancel leave error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

