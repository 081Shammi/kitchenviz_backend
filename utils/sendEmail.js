// emailService.js

const nodemailer = require("nodemailer");

// Configure nodemailer transporter using your SMTP credentials
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 25,
  secure: false, // Use true for port 465
  auth: {
    user: process.env.SMTP_USER || "shrikanthorp@gmail.com",
    pass: process.env.SMTP_PASSWORD || "ldaknehgwnwrbvrg",
  },
});

/**
 * Generates HTML content for order status email
 * @param {string} userName - User's name for personalization
 * @param {string} orderId - Order ID to include in the email
 * @param {string} status - Order status (e.g., 'accepted', 'rejected')
 * @returns {string} - HTML content string
 */
const orderStatusEmailContent = (userName, orderId, status) => `
  <div style="font-family: Arial, sans-serif; line-height: 1.6;">
    <h2>Order ${status}</h2>
    <p>Hi ${userName},</p>
    <p>Your order with ID <strong>${orderId}</strong> has been <strong>${status}</strong> by our admin.</p>
    <p>If you have any questions, feel free to contact our support team.</p>
    <br/>
    <p>Thank you for shopping with us.</p>
  </div>
`;

/**
 * Sends an order status update email to the user
 * @param {string} userEmail - Recipient email address
 * @param {string} userName - Recipient name
 * @param {string} orderId - Order ID
 * @param {string} status - Status update (e.g., 'accepted', 'rejected')
 * @returns {Promise<boolean>} - Returns true if email sent successfully, else false
 */
async function sendOrderStatusEmail(userEmail, userName, orderId, status) {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER || "shrikanthorp@gmail.com",
      to: userEmail,
      subject: `Your order has been ${status}`,
      html: orderStatusEmailContent(userName, orderId, status),
      envelope: {
        from: process.env.SMTP_USER || "shrikanthorp@gmail.com",
        to: userEmail,
      },
    });
    return true;
  } catch (error) {
    console.error("Error sending order status email:", error);
    return false;
  }
}

module.exports = {
  sendOrderStatusEmail,
};
