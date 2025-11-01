import crypto from "crypto";

/**
 * Generate secure random token
 */
export const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString("hex");
};

/**
 * Hash sensitive data
 */
export const hashData = (data) => {
  return crypto.createHash("sha256").update(data).digest("hex");
};

/**
 * Validate JWT token structure
 */
export const isValidTokenFormat = (token) => {
  if (!token || typeof token !== "string") return false;
  const parts = token.split(".");
  return parts.length === 3;
};

/**
 * Check if request is from trusted source (basic implementation)
 */
export const isTrustedSource = (req) => {
  // In production, implement proper origin checking
  const origin = req.headers.origin || req.headers.referer;
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000"];
  
  if (!origin) return true; // Allow requests without origin (mobile apps, etc.)
  
  return allowedOrigins.some((allowed) => origin.includes(allowed));
};

/**
 * Sanitize user input to prevent SQL injection and XSS
 */
export const sanitizeInput = (input) => {
  if (typeof input !== "string") return input;
  
  return input
    .replace(/[<>]/g, "") // Remove HTML tags
    .replace(/['";\\]/g, "") // Remove SQL injection characters
    .trim();
};

/**
 * Validate file upload (if needed)
 */
export const validateFileUpload = (file, allowedTypes = [], maxSize = 5242880) => {
  if (!file) return { valid: false, message: "No file provided" };
  
  if (file.size > maxSize) {
    return { valid: false, message: `File size exceeds ${maxSize / 1024 / 1024}MB limit` };
  }
  
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
    return { valid: false, message: "File type not allowed" };
  }
  
  return { valid: true };
};

