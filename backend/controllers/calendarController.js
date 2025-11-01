import { Op } from "sequelize";
import Attendance from "../models/Attendance.js";
import Leave from "../models/Leave.js";
import LeaveBalance from "../models/LeaveBalance.js";
import Holiday from "../models/Holiday.js";
import Employee from "../models/Employee.js";

/**
 * Get monthly calendar with attendance, leaves, and analytics
 */
export const getMonthlyCalendar = async (req, res) => {
  try {
    const { employee_id, month, year } = req.query;
    const queryEmployeeId = employee_id || req.user.id;
    const currentMonth = month || new Date().getMonth() + 1;
    const currentYear = year || new Date().getFullYear();

    // Permission check
    if (employee_id && employee_id != req.user.id) {
      if (!["HR", "Executive", "System Admin"].includes(req.user.role)) {
        return res.status(403).json({
          error: "You don't have permission to view this calendar",
        });
      }
    }

    // Get date range for the month
    const startDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const endDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

    // Get all attendance records for the month
    const attendanceRecords = await Attendance.findAll({
      where: {
        employee_id: queryEmployeeId,
        date: {
          [Op.between]: [startDate, endDate],
        },
      },
      order: [["date", "ASC"]],
    });

    // Get all leaves for the month
    const leaves = await Leave.findAll({
      where: {
        employee_id: queryEmployeeId,
        status: {
          [Op.in]: ["Pending", "Approved"],
        },
        [Op.or]: [
          {
            start_date: {
              [Op.between]: [startDate, endDate],
            },
          },
          {
            end_date: {
              [Op.between]: [startDate, endDate],
            },
          },
          {
            [Op.and]: [
              { start_date: { [Op.lte]: startDate } },
              { end_date: { [Op.gte]: endDate } },
            ],
          },
        ],
      },
    });

    // Get holidays for the month
    const holidays = await Holiday.findAll({
      where: {
        year: currentYear,
        is_active: true,
        date: {
          [Op.between]: [startDate, endDate],
        },
      },
    });

    // Build calendar days
    const calendarDays = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dayOfWeek = new Date(date).getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      // Find attendance for this date
      const attendance = attendanceRecords.find((a) => a.date === date);

      // Check if holiday
      const holiday = holidays.find((h) => h.date === date);

      // Check if on leave
      const leave = leaves.find((l) => {
        const leaveStart = new Date(l.start_date);
        const leaveEnd = new Date(l.end_date);
        const currentDate = new Date(date);
        return currentDate >= leaveStart && currentDate <= leaveEnd;
      });

      let status = "Absent";
      if (holiday) {
        status = "Holiday";
      } else if (leave && leave.status === "Approved") {
        status = "Leave";
      } else if (leave && leave.status === "Pending") {
        status = "Leave (Pending)";
      } else if (attendance) {
        status = attendance.status;
      } else if (isWeekend && !attendance) {
        status = "Weekend";
      }

      calendarDays.push({
        date,
        day,
        day_of_week: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][dayOfWeek],
        is_weekend: isWeekend,
        status,
        attendance: attendance
          ? {
              check_in_time: attendance.check_in_time,
              check_out_time: attendance.check_out_time,
              work_hours: attendance.work_hours,
              is_late: attendance.is_late,
              late_minutes: attendance.late_minutes,
              is_early_exit: attendance.is_early_exit,
              early_exit_minutes: attendance.early_exit_minutes,
            }
          : null,
        holiday: holiday ? { name: holiday.name, type: holiday.type } : null,
        leave: leave
          ? {
              leave_type: leave.leave_type,
              status: leave.status,
              total_days: leave.total_days,
            }
          : null,
      });
    }

    // Calculate statistics
    const stats = {
      total_days: daysInMonth,
      present: calendarDays.filter((d) => d.status === "Present").length,
      absent: calendarDays.filter((d) => d.status === "Absent").length,
      leave: calendarDays.filter((d) => d.status === "Leave" || d.status === "Leave (Pending)").length,
      holiday: calendarDays.filter((d) => d.status === "Holiday").length,
      weekend: calendarDays.filter((d) => d.is_weekend).length,
      late_count: calendarDays.filter((d) => d.attendance?.is_late).length,
      early_exit_count: calendarDays.filter((d) => d.attendance?.is_early_exit).length,
      total_work_hours: calendarDays.reduce((sum, d) => sum + (d.attendance?.work_hours || 0), 0),
      total_late_minutes: calendarDays.reduce((sum, d) => sum + (d.attendance?.late_minutes || 0), 0),
      total_early_exit_minutes: calendarDays.reduce((sum, d) => sum + (d.attendance?.early_exit_minutes || 0), 0),
    };

    // Get leave balances
    const leaveBalances = await LeaveBalance.findAll({
      where: {
        employee_id: queryEmployeeId,
        year: currentYear,
      },
    });

    res.json({
      month: currentMonth,
      year: currentYear,
      calendar: calendarDays,
      statistics: stats,
      leave_balances: leaveBalances,
    });
  } catch (error) {
    console.error("Get monthly calendar error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Get leave balance by category
 */
export const getLeaveBalance = async (req, res) => {
  try {
    const { employee_id, year } = req.query;
    const queryEmployeeId = employee_id || req.user.id;
    const currentYear = year || new Date().getFullYear();

    // Permission check
    if (employee_id && employee_id != req.user.id) {
      if (!["HR", "Executive", "System Admin"].includes(req.user.role)) {
        return res.status(403).json({
          error: "You don't have permission to view this leave balance",
        });
      }
    }

    const leaveBalances = await LeaveBalance.findAll({
      where: {
        employee_id: queryEmployeeId,
        year: currentYear,
      },
      include: [
        {
          model: Employee,
          attributes: ["id", "full_name", "email"],
        },
      ],
    });

    // Calculate totals
    const totals = {
      total_allocated: leaveBalances.reduce((sum, lb) => sum + lb.total_allocated, 0),
      total_used: leaveBalances.reduce((sum, lb) => sum + lb.used, 0),
      total_pending: leaveBalances.reduce((sum, lb) => sum + lb.pending, 0),
      total_balance: leaveBalances.reduce((sum, lb) => sum + lb.balance, 0),
    };

    res.json({
      year: currentYear,
      leave_balances: leaveBalances,
      totals,
    });
  } catch (error) {
    console.error("Get leave balance error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

