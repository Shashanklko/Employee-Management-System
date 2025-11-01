import bcrypt from "bcrypt";
import Executive from "../models/Executive.js";

/**
 * Get all executives (System Admin only)
 */
export const getAllExecutives = async (req, res) => {
  try {
    const { page = 1, limit = 10, is_active } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (is_active !== undefined) where.is_active = is_active === "true";

    const executives = await Executive.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["createdAt", "DESC"]],
      attributes: { exclude: ["password"] },
    });

    res.json({
      executives: executives.rows,
      total: executives.count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(executives.count / limit),
    });
  } catch (error) {
    console.error("Get all executives error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Create executive (System Admin only)
 */
export const createExecutive = async (req, res) => {
  try {
    const { name, email, password, department } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        error: "Validation error",
        message: "Name, email, and password are required",
      });
    }

    const existingExecutive = await Executive.findOne({ where: { email } });
    if (existingExecutive) {
      return res.status(409).json({
        error: "Conflict",
        message: "Executive with this email already exists",
      });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const executive = await Executive.create({
      name,
      email,
      password: hashedPassword,
      department,
      role: "Executive",
      is_active: true,
    });

    const { password: _, ...executiveResponse } = executive.toJSON();

    res.status(201).json({
      message: "Executive created successfully",
      executive: executiveResponse,
    });
  } catch (error) {
    console.error("Create executive error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Update executive (System Admin only)
 */
export const updateExecutive = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, department, is_active } = req.body;

    const executive = await Executive.findByPk(id);
    if (!executive) {
      return res.status(404).json({
        error: "Not found",
        message: "Executive not found",
      });
    }

    if (name !== undefined) executive.name = name;
    if (email !== undefined) executive.email = email;
    if (department !== undefined) executive.department = department;
    if (is_active !== undefined) executive.is_active = is_active;

    await executive.save();

    const { password: _, ...executiveResponse } = executive.toJSON();

    res.json({
      message: "Executive updated successfully",
      executive: executiveResponse,
    });
  } catch (error) {
    console.error("Update executive error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};
