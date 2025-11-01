import { createAuditLog, getClientIP, getUserAgent } from "../utils/auditLogger.js";

/**
 * Middleware to automatically log successful API requests
 * Use this middleware on routes that need audit logging
 */
export const auditMiddleware = (action, entity_type) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override res.json to log after response
    res.json = function (data) {
      // Log the action if user is authenticated
      if (req.user) {
        createAuditLog({
          action: action || `${req.method}_${req.route?.path || req.path}`,
          entity_type: entity_type || "Unknown",
          entity_id: req.params?.id || req.params?.employee_id || req.params?.department_id || null,
          user_id: req.user.id,
          user_type: req.user.role,
          user_email: req.user.email,
          ip_address: getClientIP(req),
          user_agent: getUserAgent(req),
          status: res.statusCode < 400 ? "SUCCESS" : "FAILED",
          metadata: {
            method: req.method,
            path: req.path,
            query: req.query,
          },
        }).catch((err) => {
          console.error("Audit logging error:", err);
        });
      }

      // Call original json method
      return originalJson(data);
    };

    next();
  };
};

