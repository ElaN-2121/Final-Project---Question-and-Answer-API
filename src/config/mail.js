require('dotenv').config();
const nodemailer = require("nodemailer");

const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT || 587);

if (!smtpHost || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
  throw new Error(
    'SMTP configuration is incomplete. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in .env.'
  );
}

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

module.exports = transporter;
