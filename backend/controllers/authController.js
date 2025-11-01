import bcrypt from "bcrypt";
import Employee from "../models/Employee.js";
import Executive from "../models/Executive.js";
import HR from "../models/HR.js";
import { generateToken } from "../utils/jwtUtils.js";
import { sendWelcomeEmail, sendEmail } from "../utils/emailUtils.js";
import { sendWelcomeWhatsApp } from "../utils/whatsappUtils.js";
import Message from "../models/Message.js";

/**
 * Helper function to find user by email across all user types
 */
const findUserByEmail = async (email) => {
  let user = await Employee.findOne({ where: { email, is_active: true } });
  let userType = "Employee";

  if (!user) {
    user = await HR.findOne({ where: { email, is_active: true } });
    userType = "HR";
  }

  if (!user) {
    user = await Executive.findOne({ where: { email, is_active: true } });
    userType = "Executive";
  }

  if (!user) {
    return null;
  }

  return { user, userType };
};

/**
 * Register new employee (HR/System Admin only)
 */
export const register = async (req, res) => {
  try {
    const {
      full_name,
      email,
      password,
      role,
      department,
      current_salary,
      bonus,
    } = req.body;

    // Validation
    if (!full_name || !email || !password) {
      return res.status(400).json({
        error: "Validation error",
        message: "Full name, email, and password are required",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: "Validation error",
        message: "Invalid email format",
      });
    }

    // Check if user already exists
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        error: "Conflict",
        message: "User with this email already exists",
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create employee
    const employee = await Employee.create({
      full_name,
      email,
      password: hashedPassword,
      role: role || "Employee",
      department,
      current_salary: current_salary || 0,
      bonus: bonus || 0,
      is_active: true,
    });

    // Send welcome email
    try {
      await sendWelcomeEmail(email, full_name, password);
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
    }

    // Remove password from response
    const { password: _, ...employeeResponse } = employee.toJSON();

    res.status(201).json({
      message: "Employee registered successfully",
      employee: employeeResponse,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Login user
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        error: "Validation error",
        message: "Email and password are required",
      });
    }

    // Find user
    const userData = await findUserByEmail(email);
    if (!userData) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid email or password",
      });
    }

    const { user, userType } = userData;

    // Check if user is active
    if (user.is_active === false) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Account is deactivated. Please contact administrator.",
      });
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
      } else {
        // Account is still blocked
        const message = user.blocked_until
          ? `Account is blocked until ${new Date(
              user.blocked_until
            ).toLocaleString()}. Reason: ${
              user.block_reason || "Not specified"
            }`
          : `Account is blocked. Reason: ${
              user.block_reason || "Not specified"
            }`;

        return res.status(403).json({
          error: "Account Blocked",
          message: message,
          blocked_until: user.blocked_until,
          block_reason: user.block_reason,
          canAppeal: true, // Allow user to submit appeal
        });
      }
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid email or password",
      });
    }

    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      userType,
    });

    // Prepare user response
    const userResponse = {
      id: user.id,
      email: user.email,
      role: user.role,
      userType,
      name: user.full_name || user.name,
      department: user.department,
    };

    res.json({
      message: "Login successful",
      token,
      user: userResponse,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Helper function to find user by email (including inactive users)
 * Used for block status checking
 */
const findUserByEmailAnyStatus = async (email) => {
  let user = await Employee.findOne({ where: { email } });
  let userType = "Employee";

  if (!user) {
    user = await HR.findOne({ where: { email } });
    userType = "HR";
  }

  if (!user) {
    user = await Executive.findOne({ where: { email } });
    userType = "Executive";
  }

  if (!user) {
    return null;
  }

  return { user, userType };
};

/**
 * Check block status for a user (Public - no authentication required)
 * User can check their block status using email and a verification method
 */
export const checkBlockStatus = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: "Validation error",
        message: "Email is required",
      });
    }

    // Find user (including inactive users for block status check)
    const userData = await findUserByEmailAnyStatus(email);
    if (!userData) {
      // Don't reveal if email exists for security
      return res.status(404).json({
        error: "Not found",
        message: "User not found",
      });
    }

    const { user } = userData;

    // Check if blocked
    if (!user.is_blocked) {
      return res.json({
        is_blocked: false,
        message: "Your account is not blocked. You can login normally.",
      });
    }

    // Check if block has expired
    let isExpired = false;
    if (user.blocked_until && new Date() > new Date(user.blocked_until)) {
      isExpired = true;
      // Auto-unblock
      user.is_blocked = false;
      user.blocked_until = null;
      user.block_reason = null;
      user.blocked_by = null;
      await user.save();
    }

    if (isExpired) {
      return res.json({
        is_blocked: false,
        message: "Your block has expired. You can now login.",
      });
    }

    // Account is still blocked
    return res.json({
      is_blocked: true,
      blocked_until: user.blocked_until,
      block_reason: user.block_reason,
      days_remaining: user.blocked_until
        ? Math.ceil(
            (new Date(user.blocked_until) - new Date()) / (1000 * 60 * 60 * 24)
          )
        : null,
      message: user.blocked_until
        ? `Your account is blocked until ${new Date(
            user.blocked_until
          ).toLocaleString()}. Reason: ${user.block_reason || "Not specified"}`
        : `Your account is permanently blocked. Reason: ${
            user.block_reason || "Not specified"
          }`,
      canAppeal: true,
    });
  } catch (error) {
    console.error("Check block status error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Submit appeal for blocked account (Public - no authentication required)
 * Blocked users can submit an appeal via email to HR/Executive
 */
export const submitBlockAppeal = async (req, res) => {
  try {
    const { email, appeal_message, contact_preference } = req.body;

    if (!email || !appeal_message) {
      return res.status(400).json({
        error: "Validation error",
        message: "Email and appeal message are required",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: "Validation error",
        message: "Invalid email format",
      });
    }

    // Find user (including inactive users)
    const userData = await findUserByEmailAnyStatus(email);
    if (!userData) {
      return res.status(404).json({
        error: "Not found",
        message: "User not found",
      });
    }

    const { user, userType } = userData;

    // Verify user is actually blocked
    if (!user.is_blocked) {
      return res.status(400).json({
        error: "Bad request",
        message: "Your account is not blocked. No appeal needed.",
      });
    }

    // Find all active HR staff to send appeal to via email (HR handles appeals first)
    const hrStaff = await HR.findAll({ where: { is_active: true } });

    if (hrStaff.length === 0) {
      // If no HR available, fallback to Executive
      const executives = await Executive.findAll({
        where: { is_active: true },
      });
      if (executives.length === 0) {
        return res.status(503).json({
          error: "Service unavailable",
          message:
            "No HR or Executive available to receive appeals. Please contact support directly.",
        });
      }
      // Use executives as recipients if no HR available
      var recipients = executives;
    } else {
      // Primary: Send to HR only
      var recipients = hrStaff;
    }

    // Prepare email content
    const appealSubject = `🚨 Block Appeal Request - ${
      user.full_name || user.name
    }`;

    const blockedUntilFormatted = user.blocked_until
      ? new Date(user.blocked_until).toLocaleString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Permanently (Manual unblock required)";

    const daysRemaining = user.blocked_until
      ? Math.ceil(
          (new Date(user.blocked_until) - new Date()) / (1000 * 60 * 60 * 24)
        )
      : null;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f44336; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
          .info-box { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #f44336; }
          .appeal-box { background-color: #fff3cd; padding: 15px; margin: 15px 0; border-left: 4px solid #ffc107; }
          .footer { background-color: #333; color: white; padding: 15px; text-align: center; border-radius: 0 0 5px 5px; font-size: 12px; }
          .label { font-weight: bold; color: #555; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🚨 Block Appeal Request</h2>
          </div>
          
          <div class="content">
            <div class="info-box">
              <h3>Employee Information</h3>
              <p><span class="label">Name:</span> ${
                user.full_name || user.name
              }</p>
              <p><span class="label">Email:</span> ${email}</p>
              <p><span class="label">User Type:</span> ${userType}</p>
              <p><span class="label">User ID:</span> ${user.id}</p>
            </div>

            <div class="info-box">
              <h3>Block Details</h3>
              <p><span class="label">Blocked Until:</span> ${blockedUntilFormatted}</p>
              ${
                daysRemaining
                  ? `<p><span class="label">Days Remaining:</span> ${daysRemaining} day(s)</p>`
                  : ""
              }
              <p><span class="label">Block Reason:</span> ${
                user.block_reason || "Not specified"
              }</p>
              <p><span class="label">Blocked By:</span> User ID ${
                user.blocked_by || "Unknown"
              }</p>
            </div>

            <div class="appeal-box">
              <h3>📝 Appeal Message</h3>
              <p style="white-space: pre-wrap;">${appeal_message}</p>
            </div>

            <div class="info-box">
              <p><span class="label">Contact Preference:</span> ${
                contact_preference || "Email"
              }</p>
              <p><span class="label">Appeal Submitted:</span> ${new Date().toLocaleString(
                "en-US",
                {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                }
              )}</p>
            </div>

            <p style="margin-top: 20px;">
              <strong>Action Required:</strong> Please review this appeal and take appropriate action. 
              You can unblock the employee through the Employee Management System if the appeal is approved.
            </p>
          </div>

          <div class="footer">
            <p>This appeal was automatically generated by the Employee Management System</p>
            <p>Please do not reply to this email. Use the system to manage the appeal.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailText = `
Block Appeal Request

Employee Information:
- Name: ${user.full_name || user.name}
- Email: ${email}
- User Type: ${userType}
- User ID: ${user.id}

Block Details:
- Blocked Until: ${blockedUntilFormatted}
${daysRemaining ? `- Days Remaining: ${daysRemaining} day(s)\n` : ""}
- Block Reason: ${user.block_reason || "Not specified"}
- Blocked By: User ID ${user.blocked_by || "Unknown"}

Appeal Message:
${appeal_message}

Contact Preference: ${contact_preference || "Email"}
Appeal Submitted: ${new Date().toLocaleString()}

---
Action Required: Please review this appeal and take appropriate action through the Employee Management System.
    `;

    // Send email to all HR and Executive staff
    const emailPromises = recipients.map((recipient) =>
      sendEmail({
        to: recipient.email,
        subject: appealSubject,
        html: emailHtml,
        text: emailText,
      }).catch((err) => {
        console.error(`Failed to send email to ${recipient.email}:`, err);
        return {
          success: false,
          error: err.message,
          recipient: recipient.email,
        };
      })
    );

    // Send emails
    const emailResults = await Promise.allSettled(emailPromises);
    const successfulEmails = emailResults.filter(
      (r) => r.status === "fulfilled" && r.value?.success !== false
    ).length;
    const failedEmails = emailResults.filter(
      (r) =>
        r.status === "rejected" ||
        (r.status === "fulfilled" && r.value?.success === false)
    ).length;

    if (successfulEmails === 0) {
      return res.status(500).json({
        error: "Email delivery failed",
        message:
          "Failed to send appeal email. Please try again later or contact support directly.",
      });
    }

    const recipientEmails = recipients.map((r) => r.email).join(", ");

    // Also create a message in the system for tracking (optional - for internal system records)
    try {
      if (recipients.length > 0) {
        const firstRecipient = recipients[0];
        const recipientType = hrStaff.includes(firstRecipient)
          ? "HR"
          : "Executive";

        await Message.create({
          sender_id: user.id,
          sender_type: userType,
          receiver_id: firstRecipient.id,
          receiver_type: recipientType,
          subject: appealSubject,
          content: emailText,
          is_read: false,
          is_archived: false,
        });
      }
    } catch (messageError) {
      console.error("Failed to create appeal message in system:", messageError);
      // Don't fail the request if message creation fails, email is more important
    }

    res.json({
      message: `Appeal submitted successfully! Email sent to ${successfulEmails} HR staff member(s). HR will review your appeal and contact you. If needed, HR can escalate to Executive for higher-level review.`,
      appeal_id: `APPEAL-${Date.now()}`,
      emails_sent: successfulEmails,
      emails_failed: failedEmails,
      recipients: recipientEmails,
      messages_created: successfulMessages,
      note:
        failedEmails > 0
          ? `Warning: Some emails failed to send. Please contact support if you don't receive a response.`
          : "All appeal emails sent successfully to HR. HR will review and may escalate to Executive if needed.",
    });
  } catch (error) {
    console.error("Submit appeal error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Get current user profile
 */
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.userType;

    let user;

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
        return res.status(404).json({
          error: "Not found",
          message: "User not found",
        });
    }

    if (!user) {
      return res.status(404).json({
        error: "Not found",
        message: "User not found",
      });
    }

    const { password: _, ...userResponse } = user.toJSON();

    res.json({
      user: userResponse,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Change password
 */
export const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.userType;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: "Validation error",
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: "Validation error",
        message: "New password must be at least 6 characters long",
      });
    }

    // Find user
    let user;
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
        return res.status(404).json({
          error: "Not found",
          message: "User not found",
        });
    }

    if (!user) {
      return res.status(404).json({
        error: "Not found",
        message: "User not found",
      });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isPasswordValid) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Current password is incorrect",
      });
    }

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    user.password = hashedPassword;
    await user.save();

    res.json({
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};
