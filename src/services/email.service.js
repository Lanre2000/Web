// Dual-mode Email Dispatch Service (SMTP / SendGrid + Demo Fallback)

class EmailService {
  constructor() {
    this.smtpHost = process.env.SMTP_HOST || null;
    this.smtpPort = process.env.SMTP_PORT || 587;
    this.smtpUser = process.env.SMTP_USER || null;
    this.smtpPass = process.env.SMTP_PASS || null;
    this.fromEmail = process.env.SMTP_FROM || 'security@satoshiyield.com';
  }

  isSmtpConfigured() {
    return Boolean(this.smtpHost && this.smtpUser && this.smtpPass);
  }

  async sendOtpEmail(toEmail, otpCode) {
    const isLive = this.isSmtpConfigured();

    console.log(`\n======================================================`);
    console.log(`[SATOSHIYIELD SECURITY] Email OTP Dispatch`);
    console.log(` -> Destination: ${toEmail}`);
    console.log(` -> 6-Digit Code: ${otpCode}`);
    console.log(` -> Engine Mode: ${isLive ? 'Live SMTP Transport' : 'Interactive Demo Mode'}`);
    console.log(`======================================================\n`);

    if (isLive) {
      try {
        // Dynamic optional nodemailer require if installed in production
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
          host: this.smtpHost,
          port: this.smtpPort,
          secure: this.smtpPort == 465,
          auth: {
            user: this.smtpUser,
            pass: this.smtpPass
          }
        });

        await transporter.sendMail({
          from: `"SatoshiYield Security" <${this.fromEmail}>`,
          to: toEmail,
          subject: `${otpCode} is your SatoshiYield Verification Code`,
          text: `Your SatoshiYield verification code is ${otpCode}. This code is valid for 10 minutes.`,
          html: `
            <div style="font-family: sans-serif; background: #07090e; color: #ffffff; padding: 24px; border-radius: 8px;">
              <h2 style="color: #f7931a;">SatoshiYield Security Verification</h2>
              <p>Your one-time 6-digit numeric verification code is:</p>
              <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #f7931a; background: #141a27; padding: 16px; border-radius: 6px; text-align: center; margin: 16px 0;">
                ${otpCode}
              </div>
              <p style="color: #94a3b8; font-size: 12px;">This code expires in 10 minutes. If you did not request this, please disregard.</p>
            </div>
          `
        });

        return { sent: true, mode: 'SMTP', otpCode };
      } catch (err) {
        console.error('SMTP Transport failed, falling back to demo mode:', err.message);
        return { sent: false, mode: 'DEMO', otpCode, error: err.message };
      }
    }

    // In demo mode without external credentials configured:
    return { sent: true, mode: 'DEMO', otpCode };
  }
}

module.exports = new EmailService();

