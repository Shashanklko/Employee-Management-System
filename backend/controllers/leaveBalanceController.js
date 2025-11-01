import LeaveBalance from "../models/LeaveBalance.js";
import Employee from "../models/Employee.js";
import { createAuditLog, getClientIP, getUserAgent } from "../utils/auditLogger.js";
import { requireHR } from "../middleware/roleMiddleware.js";

/**
 * Update leave allocation (HR/Executive/System Admin only)
 * Used to set initial allocations or adjust balances
 */
export const updateLeaveAllocation = async (req, res) => {
  try {
    const { employee_id, year, leave_type, total_allocated } = req.body;

    if (!employee_id || !year || !leave_type || total_allocated === undefined) {
      return res.status(400).json({
        error: "Employee ID, year, leave type, and total allocated are required",
      });
    }

    let leaveBalance = await LeaveBalance.findOne({
      where: {
        employee_id,
        year,
        leave_type,
      },
    });

    if (!leaveBalance) {
      // Create new balance record
      leaveBalance = await LeaveBalance.create({
        employee_id,
        year,
        leave_type,
        total_allocated: parseFloat(total_allocated),
        used: 0,
        pending: 0,
        balance: parseFloat(total_allocated),
      });
    } else {
      // Update allocation and recalculate balance
      const oldData = { ...leaveBalance.toJSON() };
      const newAllocated = parseFloat(total_allocated);
      
      leaveBalance.total_allocated = newAllocated;
      leaveBalance.balance = newAllocated - leaveBalance.used - leaveBalance.pending;
      await leaveBalance.save();

      // Audit log
      await createAuditLog({
        action: "UPDATE_LEAVE_ALLOCATION",
        entity_type: "LeaveBalance",
        entity_id: leaveBalance.id,
        user_id: req.user.id,
        user_type: req.user.role,
        user_email: req.user.email,
        ip_address: getClientIP(req),
        user_agent: getUserAgent(req),
        changes: {
          before: oldData,
          after: leaveBalance.toJSON(),
        },
      });
    }

    res.json({
      message: "Leave allocation updated successfully",
      leave_balance: leaveBalance,
    });
  } catch (error) {
    console.error("Update leave allocation error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

