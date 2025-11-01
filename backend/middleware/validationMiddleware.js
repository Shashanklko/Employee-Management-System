/**
 * Validation middleware for request data
 */

/**
 * Validate email format
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 */
export const validatePassword = (password) => {
  // At least 6 characters, contains at least one letter and one number
  const minLength = 6;
  if (password.length < minLength) {
    return { valid: false, message: `Password must be at least ${minLength} characters long` };
  }
  return { valid: true };
};

/**
 * Sanitize input to prevent XSS
 */
export const sanitizeInput = (input) => {
  if (typeof input !== "string") return input;
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/[<>]/g, "")
    .trim();
};

/**
 * Validate required fields
 */
export const validateRequired = (data, fields) => {
  const missing = [];
  for (const field of fields) {
    if (!data[field] || (typeof data[field] === "string" && !data[field].trim())) {
      missing.push(field);
    }
  }
  return {
    valid: missing.length === 0,
    missing,
  };
};

/**
 * Rate limiting helper (simple in-memory store)
 * In production, use Redis or a proper rate limiting library
 */
const rateLimitStore = new Map();

export const rateLimiter = (windowMs = 60000, maxRequests = 100) => {
  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    if (rateLimitStore.has(key)) {
      const requests = rateLimitStore.get(key);
      const recentRequests = requests.filter((time) => time > windowStart);
      rateLimitStore.set(key, recentRequests);
      
      if (recentRequests.length >= maxRequests) {
        return res.status(429).json({
          error: "Too many requests",
          message: "Rate limit exceeded. Please try again later.",
        });
      }
      
      recentRequests.push(now);
    } else {
      rateLimitStore.set(key, [now]);
    }

    next();
  };
};

