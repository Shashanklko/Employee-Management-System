import bcrypt from "bcrypt";
import HR from "../models/HR.js";

/**
 * Get all HR staff (System Admin only)
 */
export const getAllHR = async (req, res) => {
  try {
    const { page = 1, limit = 10, is_active } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (is_active !== undefined) where.is_active = is_active === "true";

    const hrStaff = await HR.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["createdAt", "DESC"]],
      attributes: { exclude: ["password"] },
    });

    res.json({
      hrStaff: hrStaff.rows,
      total: hrStaff.count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(hrStaff.count / limit),
    });
  } catch (error) {
    console.error("Get all HR error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Create HR staff (System Admin only)
 */
export const createHR = async (req, res) => {
  try {
    const { name, email, password, department } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        error: "Validation error",
        message: "Name, email, and password are required",
      });
    }

    const existingHR = await HR.findOne({ where: { email } });
    if (existingHR) {
      return res.status(409).json({
        error: "Conflict",
        message: "HR staff with this email already exists",
      });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const hr = await HR.create({
      name,
      email,
      password: hashedPassword,
      department,
      role: "HR",
      is_active: true,
    });

    const { password: _, ...hrResponse } = hr.toJSON();

    res.status(201).json({
      message: "HR staff created successfully",
      hr: hrResponse,
    });
  } catch (error) {
    console.error("Create HR error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Update HR staff (System Admin only)
 */
export const updateHR = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, department, is_active } = req.body;

    const hr = await HR.findByPk(id);
    if (!hr) {
      return res.status(404).json({
        error: "Not found",
        message: "HR staff not found",
      });
    }

    if (name !== undefined) hr.name = name;
    if (email !== undefined) hr.email = email;
    if (department !== undefined) hr.department = department;
    if (is_active !== undefined) hr.is_active = is_active;

    await hr.save();

    const { password: _, ...hrResponse } = hr.toJSON();

    res.json({
      message: "HR staff updated successfully",
      hr: hrResponse,
    });
  } catch (error) {
    console.error("Update HR error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

