import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

/**
 * Create email transporter
 */
const createTransporter = () => {
  // For production, configure with your SMTP settings
  // For development, you can use Gmail, SendGrid, etc.
  
  if (process.env.EMAIL_SERVICE === "gmail") {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  // Generic SMTP configuration
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

/**
 * Send email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} options.text - Plain text content (optional)
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    // Skip sending in development if email not configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log("📧 Email not configured. Would send to:", to);
      console.log("Subject:", subject);
      return { success: true, message: "Email service not configured (dev mode)" };
    }

    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      html,
      text: text || html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Error sending email:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

/**
 * Send welcome email to new employee
 */
export const sendWelcomeEmail = async (employeeEmail, employeeName, password) => {
  const html = `
    <h2>Welcome to the Employee Management System!</h2>
    <p>Hello ${employeeName},</p>
    <p>Your account has been created successfully.</p>
    <p><strong>Email:</strong> ${employeeEmail}</p>
    <p><strong>Temporary Password:</strong> ${password}</p>
    <p>Please change your password after your first login.</p>
    <p>Best regards,<br>HR Team</p>
  `;

  return sendEmail({
    to: employeeEmail,
    subject: "Welcome to Employee Management System",
    html,
  });
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password?token=${resetToken}`;
  
  const html = `
    <h2>Password Reset Request</h2>
    <p>You requested to reset your password.</p>
    <p>Click the link below to reset your password:</p>
    <p><a href="${resetUrl}">Reset Password</a></p>
    <p>This link will expire in 1 hour.</p>
    <p>If you didn't request this, please ignore this email.</p>
  `;

  return sendEmail({
    to: email,
    subject: "Password Reset Request",
    html,
  });
};

/**
 * Send payroll notification email
 */
export const sendPayrollEmail = async (employeeEmail, employeeName, payrollData) => {
  const html = `
    <h2>Payroll Notification</h2>
    <p>Hello ${employeeName},</p>
    <p>Your payroll has been processed:</p>
    <ul>
      <li><strong>Salary:</strong> $${payrollData.salary}</li>
      <li><strong>Bonus:</strong> $${payrollData.bonus || 0}</li>
      <li><strong>Total:</strong> $${payrollData.total}</li>
      <li><strong>Period:</strong> ${payrollData.period}</li>
    </ul>
    <p>Best regards,<br>HR Team</p>
  `;

  return sendEmail({
    to: employeeEmail,
    subject: "Payroll Notification",
    html,
  });
};

