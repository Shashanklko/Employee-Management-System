/**
 * Role-based access control middleware
 * Checks if user has required role(s)
 */

// Define role hierarchy (higher number = more permissions)
const ROLE_HIERARCHY = {
  "System Admin": 5,
  Executive: 4,
  HR: 3,
  Employee: 2,
  Intern: 1,
};

/**
 * Check if user role has required permission level
 * @param {string} userRole - User's role
 * @param {string|Array} allowedRoles - Required role(s)
 * @returns {boolean}
 */
const hasPermission = (userRole, allowedRoles) => {
  if (!userRole) return false;

  // System Admin has access to everything
  if (userRole === "System Admin") return true;

  // Check if role is in allowed list
  if (Array.isArray(allowedRoles)) {
    return allowedRoles.includes(userRole);
  }

  return userRole === allowedRoles;
};

/**
 * Middleware to check if user has required role
 * @param {string|Array} allowedRoles - Role(s) that can access this route
 */
export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    // Ensure user is authenticated first
    if (!req.user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
      });
    }

    const userRole = req.user.role;

    if (!hasPermission(userRole, allowedRoles)) {
      return res.status(403).json({
        error: "Forbidden",
        message: `Access denied. Required role: ${Array.isArray(allowedRoles) ? allowedRoles.join(" or ") : allowedRoles}`,
      });
    }

    next();
  };
};

/**
 * System Admin only access
 */
export const requireSystemAdmin = requireRole("System Admin");

/**
 * Executive or higher access
 */
export const requireExecutive = requireRole(["System Admin", "Executive"]);

/**
 * HR or higher access
 */
export const requireHR = requireRole(["System Admin", "Executive", "HR"]);

/**
 * Employee or higher access
 */
export const requireEmployee = requireRole(["System Admin", "Executive", "HR", "Employee"]);

/**
 * Check if user owns resource or has admin access
 * @param {number} resourceUserId - User ID of resource owner
 * @returns {Function} Middleware function
 */
export const requireOwnershipOrAdmin = (resourceUserId) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
      });
    }

    const isOwner = req.user.id === resourceUserId;
    const isAdmin = req.user.role === "System Admin" || req.user.role === "Executive" || req.user.role === "HR";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You don't have permission to access this resource",
      });
    }

    next();
  };
};

