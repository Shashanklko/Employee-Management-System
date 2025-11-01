import { Op } from "sequelize";
import AuditLog from "../models/AuditLog.js";

/**
 * Get all audit logs (System Admin only - can view summary)
 */
export const getAllAuditLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      action,
      entity_type,
      user_id,
      user_type,
      status,
      start_date,
      end_date,
      search,
    } = req.query;
    const offset = (page - 1) * limit;

    const where = {};

    if (action) where.action = { [Op.iLike]: `%${action}%` };
    if (entity_type) where.entity_type = entity_type;
    if (user_id) where.user_id = user_id;
    if (user_type) where.user_type = user_type;
    if (status) where.status = status;

    // Date range filter
    if (start_date || end_date) {
      where.createdAt = {};
      if (start_date) where.createdAt[Op.gte] = new Date(start_date);
      if (end_date) where.createdAt[Op.lte] = new Date(end_date);
    }

    // Search across multiple fields
    if (search) {
      where[Op.or] = [
        { action: { [Op.iLike]: `%${search}%` } },
        { entity_type: { [Op.iLike]: `%${search}%` } },
        { user_email: { [Op.iLike]: `%${search}%` } },
        { ip_address: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const logs = await AuditLog.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["createdAt", "DESC"]],
    });

    res.json({
      logs: logs.rows,
      total: logs.count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(logs.count / limit),
    });
  } catch (error) {
    console.error("Get all audit logs error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Get audit log summary (System Admin - view summary)
 */
export const getAuditLogSummary = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    const where = {};
    if (start_date || end_date) {
      where.createdAt = {};
      if (start_date) where.createdAt[Op.gte] = new Date(start_date);
      if (end_date) where.createdAt[Op.lte] = new Date(end_date);
    }

    // Get total logs
    const totalLogs = await AuditLog.count({ where });

    // Get logs by status
    const logsByStatus = await AuditLog.findAll({
      where,
      attributes: [
        "status",
        [AuditLog.sequelize.fn("COUNT", AuditLog.sequelize.col("id")), "count"],
      ],
      group: ["status"],
    });

    // Get logs by action type
    const logsByAction = await AuditLog.findAll({
      where,
      attributes: [
        "action",
        [AuditLog.sequelize.fn("COUNT", AuditLog.sequelize.col("id")), "count"],
      ],
      group: ["action"],
      limit: 10,
      order: [[AuditLog.sequelize.literal("count"), "DESC"]],
    });

    // Get logs by entity type
    const logsByEntity = await AuditLog.findAll({
      where,
      attributes: [
        "entity_type",
        [AuditLog.sequelize.fn("COUNT", AuditLog.sequelize.col("id")), "count"],
      ],
      group: ["entity_type"],
      limit: 10,
      order: [[AuditLog.sequelize.literal("count"), "DESC"]],
    });

    // Get logs by user type
    const logsByUserType = await AuditLog.findAll({
      where,
      attributes: [
        "user_type",
        [AuditLog.sequelize.fn("COUNT", AuditLog.sequelize.col("id")), "count"],
      ],
      group: ["user_type"],
    });

    // Get recent activity (last 24 hours)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const recentActivity = await AuditLog.count({
      where: {
        ...where,
        createdAt: { [Op.gte]: yesterday },
      },
    });

    // Get failed actions
    const failedActions = await AuditLog.count({
      where: {
        ...where,
        status: "FAILED",
      },
    });

    res.json({
      summary: {
        total_logs: totalLogs,
        recent_activity_24h: recentActivity,
        failed_actions: failedActions,
        logs_by_status: logsByStatus.map((item) => ({
          status: item.status,
          count: parseInt(item.get("count")),
        })),
        top_actions: logsByAction.map((item) => ({
          action: item.action,
          count: parseInt(item.get("count")),
        })),
        top_entities: logsByEntity.map((item) => ({
          entity_type: item.entity_type,
          count: parseInt(item.get("count")),
        })),
        logs_by_user_type: logsByUserType.map((item) => ({
          user_type: item.user_type,
          count: parseInt(item.get("count")),
        })),
      },
    });
  } catch (error) {
    console.error("Get audit log summary error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Get audit log by ID
 */
export const getAuditLogById = async (req, res) => {
  try {
    const { id } = req.params;

    const log = await AuditLog.findByPk(id);

    if (!log) {
      return res.status(404).json({ error: "Audit log not found" });
    }

    res.json({ log });
  } catch (error) {
    console.error("Get audit log by ID error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Get audit logs for specific entity
 */
export const getEntityAuditLogs = async (req, res) => {
  try {
    const { entity_type, entity_id } = req.query;

    if (!entity_type || !entity_id) {
      return res.status(400).json({
        error: "entity_type and entity_id are required",
      });
    }

    const logs = await AuditLog.findAll({
      where: {
        entity_type,
        entity_id: parseInt(entity_id),
      },
      order: [["createdAt", "DESC"]],
      limit: 100,
    });

    res.json({
      logs,
      total: logs.length,
    });
  } catch (error) {
    console.error("Get entity audit logs error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

