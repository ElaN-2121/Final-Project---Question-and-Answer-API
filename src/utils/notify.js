/**
 * OWNER: Student B
 *
 * Best-effort notification email sender for the two events this
 * side owns: "someone answered your question" and "your answer was
 * accepted". Registration/verification emails are Student A's, in
 * auth.controller.js.
 *
 * NOTE: this still requires config/mail.js at the top, which throws
 * at import time if SMTP env vars are missing. That's a pre-existing
 * condition (auth.controller.js already requires mail.js, so the
 * whole app already won't boot without SMTP configured) — this file
 * doesn't introduce that risk, just inherits it. What this file DOES
 * guard against is a delivery-time failure (wrong credentials,
 * provider rate limit, network blip) — those are caught and logged
 * instead of crashing the request that triggered the notification.
 */
const transporter = require('../config/mail.js');

const sendNotificationEmail = async ({ to, subject, text, html }) => {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
      html,
    });
  } catch (error) {
    console.error(`Notification email to ${to} failed:`, error.message);
  }
};

module.exports = { sendNotificationEmail };
