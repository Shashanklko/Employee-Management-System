import { Op } from "sequelize";
import Holiday from "../models/Holiday.js";
import { createAuditLog, getClientIP, getUserAgent } from "../utils/auditLogger.js";

/**
 * Get all holidays
 */
export const getAllHolidays = async (req, res) => {
  try {
    const { year, type, is_active } = req.query;

    const where = {};
    if (year) where.year = parseInt(year);
    if (type) where.type = type;
    if (is_active !== undefined) where.is_active = is_active === "true";

    const holidays = await Holiday.findAll({
      where,
      order: [["date", "ASC"]],
    });

    res.json({
      holidays,
      total: holidays.length,
    });
  } catch (error) {
    console.error("Get all holidays error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Get holiday by ID
 */
export const getHolidayById = async (req, res) => {
  try {
    const { id } = req.params;

    const holiday = await Holiday.findByPk(id);
    if (!holiday) {
      return res.status(404).json({ error: "Holiday not found" });
    }

    res.json({ holiday });
  } catch (error) {
    console.error("Get holiday by ID error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Create holiday (HR/Executive/System Admin only)
 */
export const createHoliday = async (req, res) => {
  try {
    const { name, date, year, type, description } = req.body;

    if (!name || !date) {
      return res.status(400).json({
        error: "Name and date are required",
      });
    }

    const holidayYear = year || new Date(date).getFullYear();

    // Check if holiday already exists for this date
    const existingHoliday = await Holiday.findOne({
      where: {
        date,
        year: holidayYear,
      },
    });

    if (existingHoliday) {
      return res.status(409).json({
        error: "Holiday already exists for this date",
      });
    }

    const holiday = await Holiday.create({
      name,
      date,
      year: holidayYear,
      type: type || "National",
      description,
      is_active: true,
      created_by: req.user.id,
    });

    // Audit log
    await createAuditLog({
      action: "CREATE_HOLIDAY",
      entity_type: "Holiday",
      entity_id: holiday.id,
      user_id: req.user.id,
      user_type: req.user.role,
      user_email: req.user.email,
      ip_address: getClientIP(req),
      user_agent: getUserAgent(req),
      changes: { created: holiday.toJSON() },
    });

    res.status(201).json({
      message: "Holiday created successfully",
      holiday,
    });
  } catch (error) {
    console.error("Create holiday error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Update holiday (HR/Executive/System Admin only)
 */
export const updateHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, date, year, type, description, is_active } = req.body;

    const holiday = await Holiday.findByPk(id);
    if (!holiday) {
      return res.status(404).json({ error: "Holiday not found" });
    }

    const oldData = { ...holiday.toJSON() };

    // Check date uniqueness if changing
    if (date) {
      const holidayYear = year || new Date(date).getFullYear();
      const existingHoliday = await Holiday.findOne({
        where: {
          date,
          year: holidayYear,
          id: { [Op.ne]: id },
        },
      });

      if (existingHoliday) {
        return res.status(409).json({
          error: "Holiday already exists for this date",
        });
      }
    }

    await holiday.update({
      ...(name && { name }),
      ...(date && { date }),
      ...(year && { year }),
      ...(type && { type }),
      ...(description !== undefined && { description }),
      ...(is_active !== undefined && { is_active }),
    });

    await holiday.reload();

    // Audit log
    await createAuditLog({
      action: "UPDATE_HOLIDAY",
      entity_type: "Holiday",
      entity_id: holiday.id,
      user_id: req.user.id,
      user_type: req.user.role,
      user_email: req.user.email,
      ip_address: getClientIP(req),
      user_agent: getUserAgent(req),
      changes: {
        before: oldData,
        after: holiday.toJSON(),
      },
    });

    res.json({
      message: "Holiday updated successfully",
      holiday,
    });
  } catch (error) {
    console.error("Update holiday error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Delete holiday (HR/Executive/System Admin only)
 */
export const deleteHoliday = async (req, res) => {
  try {
    const { id } = req.params;

    const holiday = await Holiday.findByPk(id);
    if (!holiday) {
      return res.status(404).json({ error: "Holiday not found" });
    }

    await holiday.destroy();

    // Audit log
    await createAuditLog({
      action: "DELETE_HOLIDAY",
      entity_type: "Holiday",
      entity_id: parseInt(id),
      user_id: req.user.id,
      user_type: req.user.role,
      user_email: req.user.email,
      ip_address: getClientIP(req),
      user_agent: getUserAgent(req),
      changes: { deleted: holiday.toJSON() },
    });

    res.json({
      message: "Holiday deleted successfully",
    });
  } catch (error) {
    console.error("Delete holiday error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

