import { Op } from "sequelize";
import Policy from "../models/Policy.js";
import { createAuditLog, getClientIP, getUserAgent } from "../utils/auditLogger.js";

/**
 * Get all policies (all authenticated users can view)
 */
export const getAllPolicies = async (req, res) => {
  try {
    const { category, is_active, search } = req.query;

    const where = {};
    if (category) where.category = category;
    if (is_active !== undefined) where.is_active = is_active === "true";
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { content: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const policies = await Policy.findAll({
      where,
      order: [["createdAt", "DESC"]],
    });

    res.json({
      policies,
      total: policies.length,
    });
  } catch (error) {
    console.error("Get all policies error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Get policy by ID
 */
export const getPolicyById = async (req, res) => {
  try {
    const { id } = req.params;

    const policy = await Policy.findByPk(id);
    if (!policy || !policy.is_active) {
      return res.status(404).json({ error: "Policy not found" });
    }

    res.json({ policy });
  } catch (error) {
    console.error("Get policy by ID error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Create policy (HR/Executive/System Admin only)
 */
export const createPolicy = async (req, res) => {
  try {
    const { title, category, content, version, effective_date } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        error: "Title and content are required",
      });
    }

    const policy = await Policy.create({
      title,
      category: category || "HR",
      content,
      version: version || "1.0",
      effective_date: effective_date || null,
      is_active: true,
      created_by: req.user.id,
      created_by_type: req.user.role,
    });

    // Audit log
    await createAuditLog({
      action: "CREATE_POLICY",
      entity_type: "Policy",
      entity_id: policy.id,
      user_id: req.user.id,
      user_type: req.user.role,
      user_email: req.user.email,
      ip_address: getClientIP(req),
      user_agent: getUserAgent(req),
      changes: { created: policy.toJSON() },
    });

    res.status(201).json({
      message: "Policy created successfully",
      policy,
    });
  } catch (error) {
    console.error("Create policy error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Update policy (HR/Executive/System Admin only)
 */
export const updatePolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, content, version, effective_date, is_active } = req.body;

    const policy = await Policy.findByPk(id);
    if (!policy) {
      return res.status(404).json({ error: "Policy not found" });
    }

    const oldData = { ...policy.toJSON() };

    await policy.update({
      ...(title && { title }),
      ...(category && { category }),
      ...(content && { content }),
      ...(version && { version }),
      ...(effective_date !== undefined && { effective_date }),
      ...(is_active !== undefined && { is_active }),
    });

    await policy.reload();

    // Audit log
    await createAuditLog({
      action: "UPDATE_POLICY",
      entity_type: "Policy",
      entity_id: policy.id,
      user_id: req.user.id,
      user_type: req.user.role,
      user_email: req.user.email,
      ip_address: getClientIP(req),
      user_agent: getUserAgent(req),
      changes: {
        before: oldData,
        after: policy.toJSON(),
      },
    });

    res.json({
      message: "Policy updated successfully",
      policy,
    });
  } catch (error) {
    console.error("Update policy error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Delete policy (HR/Executive/System Admin only)
 */
export const deletePolicy = async (req, res) => {
  try {
    const { id } = req.params;

    const policy = await Policy.findByPk(id);
    if (!policy) {
      return res.status(404).json({ error: "Policy not found" });
    }

    await policy.destroy();

    // Audit log
    await createAuditLog({
      action: "DELETE_POLICY",
      entity_type: "Policy",
      entity_id: parseInt(id),
      user_id: req.user.id,
      user_type: req.user.role,
      user_email: req.user.email,
      ip_address: getClientIP(req),
      user_agent: getUserAgent(req),
      changes: { deleted: policy.toJSON() },
    });

    res.json({
      message: "Policy deleted successfully",
    });
  } catch (error) {
    console.error("Delete policy error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

