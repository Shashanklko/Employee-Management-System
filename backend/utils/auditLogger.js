import AuditLog from "../models/AuditLog.js";

/**
 * Create an audit log entry
 * @param {Object} options - Audit log options
 * @param {string} options.action - Action performed (e.g., "CREATE_EMPLOYEE")
 * @param {string} options.entity_type - Entity type (e.g., "Employee", "Payroll")
 * @param {number} options.entity_id - ID of affected entity
 * @param {number} options.user_id - User ID who performed action
 * @param {string} options.user_type - User role
 * @param {string} options.user_email - User email
 * @param {Object} options.changes - Before/after changes (optional)
 * @param {string} options.ip_address - IP address (optional)
 * @param {string} options.user_agent - User agent (optional)
 * @param {string} options.status - Status: SUCCESS, FAILED, PENDING
 * @param {string} options.error_message - Error message if failed (optional)
 * @param {Object} options.metadata - Additional metadata (optional)
 */
export const createAuditLog = async (options) => {
  try {
    const {
      action,
      entity_type,
      entity_id,
      user_id,
      user_type,
      user_email,
      changes = null,
      ip_address = null,
      user_agent = null,
      status = "SUCCESS",
      error_message = null,
      metadata = null,
    } = options;

    await AuditLog.create({
      action,
      entity_type,
      entity_id,
      user_id,
      user_type,
      user_email,
      changes,
      ip_address,
      user_agent,
      status,
      error_message,
      metadata,
    });
  } catch (error) {
    console.error("Error creating audit log:", error);
    // Don't throw error - audit logging should not break main flow
  }
};

/**
 * Get client IP address from request
 */
export const getClientIP = (req) => {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    null
  );
};

/**
 * Get user agent from request
 */
export const getUserAgent = (req) => {
  return req.headers["user-agent"] || null;
};

