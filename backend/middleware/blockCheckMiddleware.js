import Employee from "../models/Employee.js";
import HR from "../models/HR.js";
import Executive from "../models/Executive.js";

/**
 * Middleware to check if user account is blocked
 * Should be used after authentication middleware
 */
export const checkBlockedStatus = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(); // Let authentication middleware handle this
    }

    const userId = req.user.id;
    const userType = req.user.userType;

    let user;

    // Find user based on type
    switch (userType) {
      case "Employee":
        user = await Employee.findByPk(userId);
        break;
      case "HR":
        user = await HR.findByPk(userId);
        break;
      case "Executive":
        user = await Executive.findByPk(userId);
        break;
      default:
        return next();
    }

    if (!user) {
      return next();
    }

    // Check if account is blocked
    if (user.is_blocked) {
      // Check if block has expired
      if (user.blocked_until && new Date() > new Date(user.blocked_until)) {
        // Auto-unblock if time has passed
        user.is_blocked = false;
        user.blocked_until = null;
        user.block_reason = null;
        user.blocked_by = null;
        await user.save();
        return next(); // Continue, account is now unblocked
      } else {
        // Account is still blocked
        const message = user.blocked_until
          ? `Your account is blocked until ${new Date(user.blocked_until).toLocaleString()}. Reason: ${user.block_reason || "Not specified"}`
          : `Your account is blocked. Reason: ${user.block_reason || "Not specified"}`;
        
        return res.status(403).json({
          error: "Account Blocked",
          message: message,
          blocked_until: user.blocked_until,
          block_reason: user.block_reason,
        });
      }
    }

    next();
  } catch (error) {
    console.error("Block check middleware error:", error);
    next(); // Continue on error to avoid blocking all requests
  }
};

