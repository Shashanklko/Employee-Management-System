import { Op } from "sequelize";
import Attendance from "../models/Attendance.js";
import Employee from "../models/Employee.js";
import Holiday from "../models/Holiday.js";
import { createAuditLog, getClientIP, getUserAgent } from "../utils/auditLogger.js";

/**
 * Calculate work hours between check-in and check-out
 */
const calculateWorkHours = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return null;
  const inTime = new Date(`2000-01-01 ${checkIn}`);
  const outTime = new Date(`2000-01-01 ${checkOut}`);
  const diffMs = outTime - inTime;
  return diffMs / (1000 * 60 * 60); // Convert to hours
};

/**
 * Check if date is a holiday
 */
const isHoliday = async (date) => {
  const holiday = await Holiday.findOne({
    where: {
      date: date,
      is_active: true,
    },
  });
  return !!holiday;
};

/**
 * Mark attendance (check-in)
 */
export const checkIn = async (req, res) => {
  try {
    const { date, check_in_time, location } = req.body;
    const employee_id = req.user.id;

    const attendanceDate = date || new Date().toISOString().split("T")[0];
    const checkInTime = check_in_time || new Date().toTimeString().split(" ")[0];

    // Check if already checked in for today
    const existingAttendance = await Attendance.findOne({
      where: {
        employee_id,
        date: attendanceDate,
      },
    });

    if (existingAttendance && existingAttendance.check_in_time) {
      return res.status(400).json({
        error: "Already checked in for this date",
        attendance: existingAttendance,
      });
    }

    // Check if holiday
    const holiday = await isHoliday(attendanceDate);
    const status = holiday ? "Holiday" : "Present";

    // Calculate if late
    const expectedCheckIn = existingAttendance?.expected_check_in || "09:00:00";
    const [expectedHour, expectedMin] = expectedCheckIn.split(":").map(Number);
    const [checkInHour, checkInMin] = checkInTime.split(":").map(Number);
    
    const expectedMinutes = expectedHour * 60 + expectedMin;
    const checkInMinutes = checkInHour * 60 + checkInMin;
    
    const isLate = checkInMinutes > expectedMinutes;
    const lateMinutes = isLate ? checkInMinutes - expectedMinutes : 0;

    let attendance;
    if (existingAttendance) {
      // Update existing record
      attendance = await existingAttendance.update({
        check_in_time: checkInTime,
        check_in_location: location || getClientIP(req),
        status: status,
        expected_check_in: expectedCheckIn,
        is_late: isLate,
        late_minutes: lateMinutes,
      });
    } else {
      // Create new record
      attendance = await Attendance.create({
        employee_id,
        date: attendanceDate,
        check_in_time: checkInTime,
        check_in_location: location || getClientIP(req),
        status: status,
        expected_check_in: expectedCheckIn,
        is_late: isLate,
        late_minutes: lateMinutes,
      });
    }

    // Audit log
    await createAuditLog({
      action: "CHECK_IN",
      entity_type: "Attendance",
      entity_id: attendance.id,
      user_id: req.user.id,
      user_type: req.user.role,
      user_email: req.user.email,
      ip_address: getClientIP(req),
      user_agent: getUserAgent(req),
      metadata: { date: attendanceDate, check_in_time: checkInTime },
    });

    res.json({
      message: "Checked in successfully",
      attendance,
    });
  } catch (error) {
    console.error("Check-in error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Mark attendance (check-out)
 */
export const checkOut = async (req, res) => {
  try {
    const { date, check_out_time, location } = req.body;
    const employee_id = req.user.id;

    const attendanceDate = date || new Date().toISOString().split("T")[0];
    const checkOutTime = check_out_time || new Date().toTimeString().split(" ")[0];

    // Find today's attendance
    const attendance = await Attendance.findOne({
      where: {
        employee_id,
        date: attendanceDate,
      },
    });

    if (!attendance) {
      return res.status(404).json({
        error: "No check-in found for this date. Please check in first.",
      });
    }

    if (attendance.check_out_time) {
      return res.status(400).json({
        error: "Already checked out for this date",
        attendance,
      });
    }

    // Calculate work hours
    const workHours = calculateWorkHours(attendance.check_in_time, checkOutTime);

    // Calculate if early exit
    const expectedCheckOut = attendance.expected_check_out || "18:00:00";
    const [expectedOutHour, expectedOutMin] = expectedCheckOut.split(":").map(Number);
    const [checkOutHour, checkOutMin] = checkOutTime.split(":").map(Number);
    
    const expectedOutMinutes = expectedOutHour * 60 + expectedOutMin;
    const checkOutMinutes = checkOutHour * 60 + checkOutMin;
    
    const isEarlyExit = checkOutMinutes < expectedOutMinutes;
    const earlyExitMinutes = isEarlyExit ? expectedOutMinutes - checkOutMinutes : 0;

    await attendance.update({
      check_out_time: checkOutTime,
      check_out_location: location || getClientIP(req),
      work_hours: workHours,
      expected_check_out: expectedCheckOut,
      is_early_exit: isEarlyExit,
      early_exit_minutes: earlyExitMinutes,
    });

    await attendance.reload();

    // Audit log
    await createAuditLog({
      action: "CHECK_OUT",
      entity_type: "Attendance",
      entity_id: attendance.id,
      user_id: req.user.id,
      user_type: req.user.role,
      user_email: req.user.email,
      ip_address: getClientIP(req),
      user_agent: getUserAgent(req),
      metadata: { date: attendanceDate, work_hours: workHours },
    });

    res.json({
      message: "Checked out successfully",
      attendance,
    });
  } catch (error) {
    console.error("Check-out error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Get attendance records
 */
export const getAttendance = async (req, res) => {
  try {
    const { employee_id, start_date, end_date, month, year, status } = req.query;
    const queryEmployeeId = employee_id || req.user.id;

    // Permission check: Employee can only view own attendance
    if (employee_id && employee_id != req.user.id) {
      if (!["HR", "Executive", "System Admin"].includes(req.user.role)) {
        return res.status(403).json({
          error: "You don't have permission to view this attendance",
        });
      }
    }

    const where = { employee_id: queryEmployeeId };

    if (start_date && end_date) {
      where.date = {
        [Op.between]: [start_date, end_date],
      };
    } else if (month && year) {
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const endDate = `${year}-${String(month).padStart(2, "0")}-31`;
      where.date = {
        [Op.between]: [startDate, endDate],
      };
    }

    if (status) where.status = status;

    const attendanceRecords = await Attendance.findAll({
      where,
      order: [["date", "DESC"]],
      include: [
        {
          model: Employee,
          attributes: ["id", "full_name", "email", "department"],
        },
      ],
    });

    res.json({
      attendance: attendanceRecords,
      total: attendanceRecords.length,
    });
  } catch (error) {
    console.error("Get attendance error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Get attendance statistics
 */
export const getAttendanceStats = async (req, res) => {
  try {
    const { employee_id, month, year } = req.query;
    const queryEmployeeId = employee_id || req.user.id;

    // Permission check
    if (employee_id && employee_id != req.user.id) {
      if (!["HR", "Executive", "System Admin"].includes(req.user.role)) {
        return res.status(403).json({
          error: "You don't have permission to view this attendance",
        });
      }
    }

    const currentMonth = month || new Date().getMonth() + 1;
    const currentYear = year || new Date().getFullYear();
    const startDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
    const endDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-31`;

    const attendanceRecords = await Attendance.findAll({
      where: {
        employee_id: queryEmployeeId,
        date: {
          [Op.between]: [startDate, endDate],
        },
      },
    });

    const stats = {
      total_days: attendanceRecords.length,
      present: attendanceRecords.filter((a) => a.status === "Present").length,
      absent: attendanceRecords.filter((a) => a.status === "Absent").length,
      leave: attendanceRecords.filter((a) => a.status === "Leave").length,
      half_day: attendanceRecords.filter((a) => a.status === "Half Day").length,
      holiday: attendanceRecords.filter((a) => a.status === "Holiday").length,
      total_work_hours: attendanceRecords.reduce(
        (sum, a) => sum + (a.work_hours || 0),
        0
      ),
      average_work_hours: 0,
    };

    const presentDays = attendanceRecords.filter((a) => a.work_hours > 0);
    if (presentDays.length > 0) {
      stats.average_work_hours =
        stats.total_work_hours / presentDays.length;
    }

    res.json({
      month: currentMonth,
      year: currentYear,
      stats,
    });
  } catch (error) {
    console.error("Get attendance stats error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Manual attendance update (HR/Executive/System Admin only)
 */
export const updateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { check_in_time, check_out_time, status, remarks, expected_check_in, expected_check_out } = req.body;

    const attendance = await Attendance.findByPk(id);
    if (!attendance) {
      return res.status(404).json({ error: "Attendance record not found" });
    }

    const oldData = { ...attendance.toJSON() };

    // Recalculate work hours and late/early if both times are provided
    let workHours = attendance.work_hours;
    let isLate = attendance.is_late;
    let lateMinutes = attendance.late_minutes;
    let isEarlyExit = attendance.is_early_exit;
    let earlyExitMinutes = attendance.early_exit_minutes;

    const expectedCheckIn = expected_check_in || attendance.expected_check_in || "09:00:00";
    const expectedCheckOut = expected_check_out || attendance.expected_check_out || "18:00:00";

    if (check_in_time && check_out_time) {
      workHours = calculateWorkHours(check_in_time, check_out_time);
      
      // Recalculate late
      const [expectedHour, expectedMin] = expectedCheckIn.split(":").map(Number);
      const [checkInHour, checkInMin] = check_in_time.split(":").map(Number);
      const expectedMinutes = expectedHour * 60 + expectedMin;
      const checkInMinutes = checkInHour * 60 + checkInMin;
      isLate = checkInMinutes > expectedMinutes;
      lateMinutes = isLate ? checkInMinutes - expectedMinutes : 0;

      // Recalculate early exit
      const [expectedOutHour, expectedOutMin] = expectedCheckOut.split(":").map(Number);
      const [checkOutHour, checkOutMin] = check_out_time.split(":").map(Number);
      const expectedOutMinutes = expectedOutHour * 60 + expectedOutMin;
      const checkOutMinutes = checkOutHour * 60 + checkOutMin;
      isEarlyExit = checkOutMinutes < expectedOutMinutes;
      earlyExitMinutes = isEarlyExit ? expectedOutMinutes - checkOutMinutes : 0;
    } else if (check_in_time) {
      // Only check-in time changed
      const [expectedHour, expectedMin] = expectedCheckIn.split(":").map(Number);
      const [checkInHour, checkInMin] = check_in_time.split(":").map(Number);
      const expectedMinutes = expectedHour * 60 + expectedMin;
      const checkInMinutes = checkInHour * 60 + checkInMin;
      isLate = checkInMinutes > expectedMinutes;
      lateMinutes = isLate ? checkInMinutes - expectedMinutes : 0;
    } else if (check_out_time && attendance.check_in_time) {
      // Only check-out time changed
      workHours = calculateWorkHours(attendance.check_in_time, check_out_time);
      const [expectedOutHour, expectedOutMin] = expectedCheckOut.split(":").map(Number);
      const [checkOutHour, checkOutMin] = check_out_time.split(":").map(Number);
      const expectedOutMinutes = expectedOutHour * 60 + expectedOutMin;
      const checkOutMinutes = checkOutHour * 60 + checkOutMin;
      isEarlyExit = checkOutMinutes < expectedOutMinutes;
      earlyExitMinutes = isEarlyExit ? expectedOutMinutes - checkOutMinutes : 0;
    }

    await attendance.update({
      ...(check_in_time && { check_in_time }),
      ...(check_out_time && { check_out_time }),
      ...(status && { status }),
      ...(remarks !== undefined && { remarks }),
      ...(workHours !== undefined && { work_hours: workHours }),
      ...(expected_check_in && { expected_check_in }),
      ...(expected_check_out && { expected_check_out }),
      ...(isLate !== undefined && { is_late: isLate }),
      ...(lateMinutes !== undefined && { late_minutes: lateMinutes }),
      ...(isEarlyExit !== undefined && { is_early_exit: isEarlyExit }),
      ...(earlyExitMinutes !== undefined && { early_exit_minutes: earlyExitMinutes }),
    });

    await attendance.reload();

    // Audit log
    await createAuditLog({
      action: "UPDATE_ATTENDANCE",
      entity_type: "Attendance",
      entity_id: attendance.id,
      user_id: req.user.id,
      user_type: req.user.role,
      user_email: req.user.email,
      ip_address: getClientIP(req),
      user_agent: getUserAgent(req),
      changes: {
        before: oldData,
        after: attendance.toJSON(),
      },
    });

    res.json({
      message: "Attendance updated successfully",
      attendance,
    });
  } catch (error) {
    console.error("Update attendance error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

