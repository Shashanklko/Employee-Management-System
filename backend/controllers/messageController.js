import Message from "../models/Message.js";
import Employee from "../models/Employee.js";
import HR from "../models/HR.js";
import Executive from "../models/Executive.js";

/**
 * Helper to get user name by ID and type
 */
const getUserName = async (userId, userType) => {
  let user;
  switch (userType) {
    case "Employee":
      user = await Employee.findByPk(userId);
      return user ? user.full_name : "Unknown";
    case "HR":
      user = await HR.findByPk(userId);
      return user ? user.name : "Unknown";
    case "Executive":
      user = await Executive.findByPk(userId);
      return user ? user.name : "Unknown";
    default:
      return "Unknown";
  }
};

/**
 * Get all messages for current user
 */
export const getMyMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.userType;
    const { page = 1, limit = 10, is_read, is_archived } = req.query;
    const offset = (page - 1) * limit;

    const where = {
      receiver_id: userId,
      receiver_type: userType,
    };

    if (is_read !== undefined) where.is_read = is_read === "true";
    if (is_archived !== undefined) where.is_archived = is_archived === "true";

    const messages = await Message.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["createdAt", "DESC"]],
    });

    // Enrich with sender names
    const enrichedMessages = await Promise.all(
      messages.rows.map(async (message) => {
        const senderName = await getUserName(message.sender_id, message.sender_type);
        return {
          ...message.toJSON(),
          sender_name: senderName,
        };
      })
    );

    res.json({
      messages: enrichedMessages,
      total: messages.count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(messages.count / limit),
    });
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Get sent messages
 */
export const getSentMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.userType;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const messages = await Message.findAndCountAll({
      where: {
        sender_id: userId,
        sender_type: userType,
      },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["createdAt", "DESC"]],
    });

    // Enrich with receiver names
    const enrichedMessages = await Promise.all(
      messages.rows.map(async (message) => {
        const receiverName = await getUserName(message.receiver_id, message.receiver_type);
        return {
          ...message.toJSON(),
          receiver_name: receiverName,
        };
      })
    );

    res.json({
      messages: enrichedMessages,
      total: messages.count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(messages.count / limit),
    });
  } catch (error) {
    console.error("Get sent messages error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Send message
 */
export const sendMessage = async (req, res) => {
  try {
    const { receiver_id, receiver_type, subject, content } = req.body;
    const sender_id = req.user.id;
    const sender_type = req.user.userType;

    // Validation
    if (!receiver_id || !receiver_type || !subject || !content) {
      return res.status(400).json({
        error: "Validation error",
        message: "Receiver ID, receiver type, subject, and content are required",
      });
    }

    // Validate receiver type
    const validTypes = ["Employee", "HR", "Executive", "System Admin"];
    if (!validTypes.includes(receiver_type)) {
      return res.status(400).json({
        error: "Validation error",
        message: "Invalid receiver type",
      });
    }

    // Check if receiver exists
    let receiver;
    switch (receiver_type) {
      case "Employee":
        receiver = await Employee.findByPk(receiver_id);
        break;
      case "HR":
        receiver = await HR.findByPk(receiver_id);
        break;
      case "Executive":
        receiver = await Executive.findByPk(receiver_id);
        break;
    }

    if (!receiver) {
      return res.status(404).json({
        error: "Not found",
        message: "Receiver not found",
      });
    }

    // Create message
    const message = await Message.create({
      sender_id,
      sender_type,
      receiver_id,
      receiver_type,
      subject,
      content,
      is_read: false,
      is_archived: false,
    });

    res.status(201).json({
      message: "Message sent successfully",
      data: message,
    });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Mark message as read
 */
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userType = req.user.userType;

    const message = await Message.findByPk(id);
    if (!message) {
      return res.status(404).json({
        error: "Not found",
        message: "Message not found",
      });
    }

    // Check if user is the receiver
    if (message.receiver_id !== userId || message.receiver_type !== userType) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You can only mark your own messages as read",
      });
    }

    message.is_read = true;
    await message.save();

    res.json({
      message: "Message marked as read",
      data: message,
    });
  } catch (error) {
    console.error("Mark as read error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Archive message
 */
export const archiveMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userType = req.user.userType;

    const message = await Message.findByPk(id);
    if (!message) {
      return res.status(404).json({
        error: "Not found",
        message: "Message not found",
      });
    }

    // Check if user is the receiver
    if (message.receiver_id !== userId || message.receiver_type !== userType) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You can only archive your own messages",
      });
    }

    message.is_archived = true;
    await message.save();

    res.json({
      message: "Message archived",
      data: message,
    });
  } catch (error) {
    console.error("Archive message error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Delete message (sender can delete sent messages)
 */
export const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userType = req.user.userType;

    const message = await Message.findByPk(id);
    if (!message) {
      return res.status(404).json({
        error: "Not found",
        message: "Message not found",
      });
    }

    // Check if user is the sender (only sender can delete)
    const isSender = message.sender_id === userId && message.sender_type === userType;
    const isAdmin = req.user.role === "System Admin";

    if (!isSender && !isAdmin) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You can only delete messages you sent",
      });
    }

    await message.destroy();

    res.json({
      message: "Message deleted successfully",
    });
  } catch (error) {
    console.error("Delete message error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Escalate appeal to Executive (HR only)
 * HR can escalate a blocked employee's appeal to Executive for higher-level review
 */
export const escalateAppeal = async (req, res) => {
  try {
    const { message_id, escalation_reason } = req.body;
    const userId = req.user.id;
    const userType = req.user.userType;

    // Only HR can escalate appeals
    if (userType !== "HR" && req.user.role !== "System Admin") {
      return res.status(403).json({
        error: "Forbidden",
        message: "Only HR can escalate appeals to Executive",
      });
    }

    if (!message_id || !escalation_reason) {
      return res.status(400).json({
        error: "Validation error",
        message: "Message ID and escalation reason are required",
      });
    }

    // Find the original appeal message
    const originalMessage = await Message.findByPk(message_id);
    if (!originalMessage) {
      return res.status(404).json({
        error: "Not found",
        message: "Appeal message not found",
      });
    }

    // Verify it's an appeal (subject contains "Appeal")
    if (!originalMessage.subject.includes("Appeal") && !originalMessage.subject.includes("appeal")) {
      return res.status(400).json({
        error: "Bad request",
        message: "This message is not an appeal",
      });
    }

    // Find all active Executives
    const executives = await Executive.findAll({ where: { is_active: true } });
    if (executives.length === 0) {
      return res.status(503).json({
        error: "Service unavailable",
        message: "No Executive available to receive escalated appeals",
      });
    }

    // Import email utility
    const { sendEmail } = await import("../utils/emailUtils.js");

    // Prepare escalation email content
    const escalationSubject = `🚨 ESCALATED: ${originalMessage.subject}`;
    
    const escalationHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #ff9800; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
          .info-box { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #ff9800; }
          .original-box { background-color: #fff3cd; padding: 15px; margin: 15px 0; border-left: 4px solid #ffc107; }
          .footer { background-color: #333; color: white; padding: 15px; text-align: center; border-radius: 0 0 5px 5px; font-size: 12px; }
          .label { font-weight: bold; color: #555; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>⚠️ Appeal Escalated to Executive</h2>
          </div>
          
          <div class="content">
            <div class="info-box">
              <h3>Escalation Information</h3>
              <p><span class="label">Escalated By:</span> ${req.user.email} (HR)</p>
              <p><span class="label">Escalated On:</span> ${new Date().toLocaleString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</p>
              <p><span class="label">Escalation Reason:</span></p>
              <p style="white-space: pre-wrap; padding-left: 15px;">${escalation_reason}</p>
            </div>

            <div class="original-box">
              <h3>📋 Original Appeal Details</h3>
              <p><span class="label">Subject:</span> ${originalMessage.subject}</p>
              <p><span class="label">Submitted:</span> ${new Date(originalMessage.createdAt).toLocaleString()}</p>
              <p><span class="label">Original Appeal:</span></p>
              <div style="background-color: white; padding: 10px; margin-top: 10px; border-radius: 3px;">
                <p style="white-space: pre-wrap;">${originalMessage.content}</p>
              </div>
            </div>

            <p style="margin-top: 20px;">
              <strong>Action Required:</strong> Please review this escalated appeal and provide guidance to HR or take appropriate action.
            </p>
          </div>

          <div class="footer">
            <p>This escalation was sent by the Employee Management System</p>
            <p>Please review through the system and respond accordingly.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const escalationText = `
Appeal Escalated to Executive

Escalation Information:
- Escalated By: ${req.user.email} (HR)
- Escalated On: ${new Date().toLocaleString()}
- Escalation Reason: ${escalation_reason}

Original Appeal Details:
- Subject: ${originalMessage.subject}
- Submitted: ${new Date(originalMessage.createdAt).toLocaleString()}
- Content: ${originalMessage.content}

---
Action Required: Please review this escalated appeal and provide guidance.
    `;

    // Send escalation email to all Executives
    const emailPromises = executives.map((executive) =>
      sendEmail({
        to: executive.email,
        subject: escalationSubject,
        html: escalationHtml,
        text: escalationText,
      }).catch((err) => {
        console.error(`Failed to send escalation email to ${executive.email}:`, err);
        return { success: false, error: err.message };
      })
    );

    // Create escalation message in system for tracking
    const escalationMessages = [];
    for (const executive of executives) {
      try {
        const escalationMsg = await Message.create({
          sender_id: userId,
          sender_type: userType,
          receiver_id: executive.id,
          receiver_type: "Executive",
          subject: escalationSubject,
          content: escalationText,
          is_read: false,
          is_archived: false,
        });
        escalationMessages.push(escalationMsg);
      } catch (err) {
        console.error(`Failed to create escalation message for Executive ${executive.id}:`, err);
      }
    }

    // Send emails
    const emailResults = await Promise.allSettled(emailPromises);
    const successfulEmails = emailResults.filter(
      (r) => r.status === "fulfilled" && r.value?.success !== false
    ).length;

    const executiveEmails = executives.map((e) => e.email).join(", ");

    res.json({
      message: `Appeal escalated successfully to ${successfulEmails} Executive(s)`,
      escalation_id: `ESCALATION-${Date.now()}`,
      emails_sent: successfulEmails,
      executives_notified: executiveEmails,
      original_appeal_id: message_id,
    });
  } catch (error) {
    console.error("Escalate appeal error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

