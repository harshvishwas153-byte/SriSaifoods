// Brevo API service for email sending
// Uses Brevo (formerly Sendinblue) for email delivery

const axios = require("axios");
const {
  BREVO_API_KEY,
  FROM_EMAIL,
  FROM_NAME,
} = require("../config/env");
const ApiError = require("../utils/ApiError");

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

class BrevoService {
  /**
   * Send OTP email to admin
   * @param {string} toEmail - Recipient email address
   * @param {string} otp - 6-digit OTP code
   * @returns {Promise<{success: boolean, messageId: string}>}
   */
  static async sendOtpEmail(toEmail, otp) {
    try {
      if (!BREVO_API_KEY) {
        throw new ApiError(500, "Brevo API key not configured");
      }

      const emailPayload = {
        sender: {
          name: FROM_NAME,
          email: FROM_EMAIL,
        },
        to: [
          {
            email: toEmail,
            name: "Admin",
          },
        ],
        subject: "Sri Sai's Fryums Admin Portal - OTP",
        htmlContent: this.getOtpEmailTemplate(otp),
        textContent: `Your OTP is: ${otp}. This OTP will expire in 5 minutes. Do not share this with anyone.`,
      };

      const response = await axios.post(BREVO_API_URL, emailPayload, {
        headers: {
          "api-key": BREVO_API_KEY,
          "Content-Type": "application/json",
        },
      });

      console.log(
        `[Brevo] OTP email sent to ${toEmail}`,
        response.data.messageId
      );

      return {
        success: true,
        messageId: response.data.messageId,
      };
    } catch (error) {
      console.error("[Brevo] Failed to send OTP email:", error.message);

      if (error.response?.status === 401) {
        throw new ApiError(500, "Brevo API key is invalid");
      }

      if (error.response?.status === 400) {
        throw new ApiError(400, "Invalid email address provided");
      }

      throw new ApiError(
        500,
        `Failed to send OTP email: ${error.message}`
      );
    }
  }

  /**
   * Get the HTML template for OTP email
   * @param {string} otp - 6-digit OTP code
   * @returns {string} HTML email template
   */
  static getOtpEmailTemplate(otp) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Arial', sans-serif; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #B8291E; }
          .content { text-align: center; }
          .otp-box { background: #FFF6E4; border: 2px solid #F2A71B; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .otp-code { font-size: 36px; font-weight: bold; color: #B8291E; letter-spacing: 4px; }
          .timer { color: #666; font-size: 14px; margin-top: 10px; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px; }
          .warning { background: #fff3cd; border: 1px solid #ffc107; color: #856404; padding: 12px; border-radius: 4px; margin-top: 20px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Sri Sai's Fryums</div>
            <p style="color: #666; margin-top: 5px;">Admin Portal</p>
          </div>
          
          <div class="content">
            <h2 style="color: #B8291E;">Verify Your Identity</h2>
            <p>Your One-Time Password (OTP) for admin login:</p>
            
            <div class="otp-box">
              <div class="otp-code">${otp}</div>
              <div class="timer">Valid for 5 minutes</div>
            </div>
            
            <p style="color: #666; margin-top: 20px;">
              Enter this code in the admin portal to verify your identity and access the dashboard.
            </p>
            
            <div class="warning">
              <strong>Security Notice:</strong> Never share this OTP with anyone. Sri Sai's staff will never ask for your OTP.
            </div>
          </div>
          
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>© 2026 Sri Sai's Fryums. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Validate Brevo API configuration
   * @returns {boolean} true if configured, false otherwise
   */
  static isConfigured() {
    return !!(BREVO_API_KEY && FROM_EMAIL && FROM_NAME);
  }
}

module.exports = BrevoService;
