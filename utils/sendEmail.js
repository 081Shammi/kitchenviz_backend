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
 * Generates HTML content for order status email (accept/reject)
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
 * Generates HTML content for order placed confirmation email
 */
const orderPlacedEmailContent = (userName, orderId) => `
  <div style="font-family: Arial, sans-serif; line-height: 1.6;">
    <h2>Order Placed Successfully</h2>
    <p>Hello ${userName},</p>
    <p>Thank you for your order! Your order id is <strong>${orderId}</strong>.</p>
    <p>We are processing your order and will notify you once it is accepted.</p>
    <br/>
    <p>If you have any questions, feel free to contact our support team.</p>
    <p>Thank you for shopping with us.</p>
  </div>
`;

/**
 * Generates HTML content for shipping status emails (dispatched, outForDelivery, delivered)
 */
const shippingStatusEmailTemplates = {
  dispatched: (userName, orderId) => `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Order Dispatched</h2>
      <p>Hi ${userName},</p>
      <p>Your order with ID <strong>${orderId}</strong> has been <strong>dispatched</strong> from our warehouse.</p>
      <p>We will update you once it is out for delivery.</p>
      <br/>
      <p>Thank you for shopping with us.</p>
    </div>
  `,
  outForDelivery: (userName, orderId) => `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Out for Delivery</h2>
      <p>Hi ${userName},</p>
      <p>Good news! Your order with ID <strong>${orderId}</strong> is now <strong>out for delivery</strong>.</p>
      <p>Please be available to receive your package.</p>
      <br/>
      <p>Thank you for shopping with us.</p>
    </div>
  `,
  delivered: (userName, orderId) => `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Order Delivered</h2>
      <p>Hi ${userName},</p>
      <p>Your order with ID <strong>${orderId}</strong> has been successfully <strong>delivered</strong>.</p>
      <p>We hope you enjoy your purchase. Thank you!</p>
    </div>
  `,
};

/**
 * Sends an order status update email (accept, reject, or shipping status)
 */
async function sendOrderStatusEmail(userEmail, userName, orderId, status) {
  try {
    let htmlContent;

    if (["dispatched", "outForDelivery", "delivered"].includes(status)) {
      htmlContent = shippingStatusEmailTemplates[status](userName, orderId);
    } else {
      htmlContent = orderStatusEmailContent(userName, orderId, status);
    }

    await transporter.sendMail({
      from: process.env.SMTP_FROM_MAIL || "kitchenvission@gmail.com",
      to: userEmail,
      subject: `Your order has been ${status}`,
      html: htmlContent,
      envelope: {
        from: process.env.SMTP_FROM_MAIL || "kitchenvission@gmail.com",
        to: userEmail,
      },
    });

    return true;
  } catch (error) {
    console.error("Error sending order status email:", error);
    return false;
  }
}

/**
 * Sends an order placed confirmation email
 */
async function sendOrderPlacedEmail(userEmail, userName, orderId) {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM_MAIL || "kitchenvission@gmail.com",
      to: userEmail,
      subject: "Your order has been placed successfully",
      html: orderPlacedEmailContent(userName, orderId),
      envelope: {
        from: process.env.SMTP_FROM_MAIL || "kitchenvission@gmail.com",
        to: userEmail,
      },
    });

    return true;
  } catch (error) {
    console.error("Error sending order placed email:", error);
    return false;
  }
}

module.exports = {
  sendOrderStatusEmail,
  sendOrderPlacedEmail,
};
