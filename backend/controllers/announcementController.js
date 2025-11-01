import { Op } from "sequelize";
import Announcement from "../models/Announcement.js";
import Employee from "../models/Employee.js";
import { createAuditLog, getClientIP, getUserAgent } from "../utils/auditLogger.js";

/**
 * Get all announcements (filtered by user role and department)
 */
export const getAllAnnouncements = async (req, res) => {
  try {
    const { page = 1, limit = 20, category, priority, is_pinned, search } = req.query;
    const offset = (page - 1) * limit;

    const where = {
      is_active: true,
    };

    // Filter expired announcements
    where[Op.or] = [
      { expires_at: null },
      { expires_at: { [Op.gte]: new Date() } },
    ];

    if (category) where.category = category;
    if (priority) where.priority = priority;
    if (is_pinned !== undefined) where.is_pinned = is_pinned === "true";
    if (search) {
      where[Op.or] = [
        ...(where[Op.or] || []),
        { title: { [Op.iLike]: `%${search}%` } },
        { content: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const announcements = await Announcement.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [
        ["is_pinned", "DESC"],
        ["createdAt", "DESC"],
      ],
    });

    // Filter by user role and department
    const user = await Employee.findByPk(req.user.id);
    const filteredAnnouncements = announcements.rows.filter((announcement) => {
      // If no target specified, show to all
      if (!announcement.target_roles && !announcement.target_departments) {
        return true;
      }

      // Check role target
      if (announcement.target_roles && announcement.target_roles.length > 0) {
        if (!announcement.target_roles.includes(user.role)) {
          return false;
        }
      }

      // Check department target
      if (announcement.target_departments && announcement.target_departments.length > 0) {
        if (!announcement.target_departments.includes(user.department)) {
          return false;
        }
      }

      return true;
    });

    res.json({
      announcements: filteredAnnouncements,
      total: filteredAnnouncements.length,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(filteredAnnouncements.length / limit),
    });
  } catch (error) {
    console.error("Get all announcements error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Get announcement by ID
 */
export const getAnnouncementById = async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findByPk(id);
    if (!announcement || !announcement.is_active) {
      return res.status(404).json({ error: "Announcement not found" });
    }

    // Check expiry
    if (announcement.expires_at && new Date(announcement.expires_at) < new Date()) {
      return res.status(404).json({ error: "Announcement has expired" });
    }

    // Increment view count
    announcement.views_count += 1;
    await announcement.save();

    res.json({ announcement });
  } catch (error) {
    console.error("Get announcement by ID error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Create announcement (System Admin, Executive, HR only)
 */
export const createAnnouncement = async (req, res) => {
  try {
    const {
      title,
      content,
      category,
      priority,
      target_roles,
      target_departments,
      is_pinned,
      expires_at,
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        error: "Title and content are required",
      });
    }

    const announcement = await Announcement.create({
      title,
      content,
      category: category || "General",
      priority: priority || "Medium",
      target_roles: target_roles || null,
      target_departments: target_departments || null,
      is_pinned: is_pinned || false,
      expires_at: expires_at || null,
      created_by: req.user.id,
      created_by_type: req.user.role,
      is_active: true,
    });

    // Audit log
    await createAuditLog({
      action: "CREATE_ANNOUNCEMENT",
      entity_type: "Announcement",
      entity_id: announcement.id,
      user_id: req.user.id,
      user_type: req.user.role,
      user_email: req.user.email,
      ip_address: getClientIP(req),
      user_agent: getUserAgent(req),
      changes: { created: announcement.toJSON() },
    });

    res.status(201).json({
      message: "Announcement created successfully",
      announcement,
    });
  } catch (error) {
    console.error("Create announcement error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Update announcement (System Admin, Executive, HR only)
 */
export const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      content,
      category,
      priority,
      target_roles,
      target_departments,
      is_pinned,
      expires_at,
      is_active,
    } = req.body;

    const announcement = await Announcement.findByPk(id);
    if (!announcement) {
      return res.status(404).json({ error: "Announcement not found" });
    }

    const oldData = { ...announcement.toJSON() };

    await announcement.update({
      ...(title && { title }),
      ...(content && { content }),
      ...(category && { category }),
      ...(priority && { priority }),
      ...(target_roles !== undefined && { target_roles }),
      ...(target_departments !== undefined && { target_departments }),
      ...(is_pinned !== undefined && { is_pinned }),
      ...(expires_at !== undefined && { expires_at }),
      ...(is_active !== undefined && { is_active }),
    });

    await announcement.reload();

    // Audit log
    await createAuditLog({
      action: "UPDATE_ANNOUNCEMENT",
      entity_type: "Announcement",
      entity_id: announcement.id,
      user_id: req.user.id,
      user_type: req.user.role,
      user_email: req.user.email,
      ip_address: getClientIP(req),
      user_agent: getUserAgent(req),
      changes: {
        before: oldData,
        after: announcement.toJSON(),
      },
    });

    res.json({
      message: "Announcement updated successfully",
      announcement,
    });
  } catch (error) {
    console.error("Update announcement error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Delete announcement (System Admin, Executive, HR only)
 */
export const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findByPk(id);
    if (!announcement) {
      return res.status(404).json({ error: "Announcement not found" });
    }

    await announcement.destroy();

    // Audit log
    await createAuditLog({
      action: "DELETE_ANNOUNCEMENT",
      entity_type: "Announcement",
      entity_id: parseInt(id),
      user_id: req.user.id,
      user_type: req.user.role,
      user_email: req.user.email,
      ip_address: getClientIP(req),
      user_agent: getUserAgent(req),
      changes: { deleted: announcement.toJSON() },
    });

    res.json({
      message: "Announcement deleted successfully",
    });
  } catch (error) {
    console.error("Delete announcement error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

