import { Op } from "sequelize";
import Notification from "../models/Notification.js";
import { createAuditLog } from "../utils/auditLogger.js";

/**
 * Create notification helper (can be used from other controllers)
 */
export const createNotification = async (options) => {
  try {
    const {
      user_id,
      user_type,
      type,
      title,
      message,
      entity_type,
      entity_id,
      action_url,
    } = options;

    await Notification.create({
      user_id,
      user_type,
      type: type || "General",
      title,
      message,
      entity_type,
      entity_id,
      action_url,
      is_read: false,
    });
  } catch (error) {
    console.error("Error creating notification:", error);
    // Don't throw - notifications shouldn't break main flow
  }
};

/**
 * Get user notifications
 */
export const getNotifications = async (req, res) => {
  try {
    const { is_read, type, limit = 50 } = req.query;

    const where = {
      user_id: req.user.id,
      user_type: req.user.role,
    };

    if (is_read !== undefined) {
      where.is_read = is_read === "true";
    }
    if (type) where.type = type;

    const notifications = await Notification.findAll({
      where,
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
    });

    // Count unread
    const unreadCount = await Notification.count({
      where: {
        ...where,
        is_read: false,
      },
    });

    res.json({
      notifications,
      unread_count: unreadCount,
      total: notifications.length,
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Mark notification as read
 */
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByPk(id);
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    // Check ownership
    if (notification.user_id !== req.user.id) {
      return res.status(403).json({
        error: "You can only mark your own notifications as read",
      });
    }

    await notification.update({ is_read: true });

    res.json({
      message: "Notification marked as read",
      notification,
    });
  } catch (error) {
    console.error("Mark notification as read error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async (req, res) => {
  try {
    await Notification.update(
      { is_read: true },
      {
        where: {
          user_id: req.user.id,
          user_type: req.user.role,
          is_read: false,
        },
      }
    );

    res.json({
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("Mark all notifications as read error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Delete notification
 */
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByPk(id);
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    // Check ownership
    if (notification.user_id !== req.user.id) {
      return res.status(403).json({
        error: "You can only delete your own notifications",
      });
    }

    await notification.destroy();

    res.json({
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error("Delete notification error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

