import dotenv from "dotenv";

dotenv.config();

/**
 * Send WhatsApp message using Twilio API or similar service
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} message - Message content
 */
export const sendWhatsAppMessage = async (phoneNumber, message) => {
  try {
    // If WhatsApp API key is not configured, skip in development
    if (!process.env.WHATSAPP_API_KEY || !process.env.WHATSAPP_API_URL) {
      console.log("📱 WhatsApp not configured. Would send to:", phoneNumber);
      console.log("Message:", message);
      return { success: true, message: "WhatsApp service not configured (dev mode)" };
    }

    // Example using Twilio WhatsApp API
    // Replace this with your actual WhatsApp API provider
    const response = await fetch(process.env.WHATSAPP_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.WHATSAPP_API_KEY}`,
      },
      body: JSON.stringify({
        to: phoneNumber,
        message: message,
      }),
    });

    if (!response.ok) {
      throw new Error(`WhatsApp API error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("✅ WhatsApp message sent:", data);
    return { success: true, data };
  } catch (error) {
    console.error("❌ Error sending WhatsApp message:", error);
    throw new Error(`Failed to send WhatsApp message: ${error.message}`);
  }
};

/**
 * Send welcome WhatsApp message
 */
export const sendWelcomeWhatsApp = async (phoneNumber, employeeName) => {
  const message = `Welcome to Employee Management System, ${employeeName}! Your account has been created. Please check your email for login credentials.`;
  return sendWhatsAppMessage(phoneNumber, message);
};

/**
 * Send payroll notification via WhatsApp
 */
export const sendPayrollWhatsApp = async (phoneNumber, employeeName, payrollData) => {
  const message = `Hello ${employeeName}, your payroll of $${payrollData.total} has been processed for ${payrollData.period}. Check your email for details.`;
  return sendWhatsAppMessage(phoneNumber, message);
};

