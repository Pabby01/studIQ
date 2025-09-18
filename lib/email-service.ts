import nodemailer from 'nodemailer';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  retries?: number;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured = false;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    try {
      const emailConfig: EmailConfig = {
        host: process.env.SMTP_HOST || '',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASSWORD || '',
        },
      };

      // Check if all required environment variables are present
      if (!emailConfig.host || !emailConfig.auth.user || !emailConfig.auth.pass) {
        console.warn('Email service not configured: Missing SMTP environment variables');
        this.isConfigured = false;
        return;
      }

      this.transporter = nodemailer.createTransport(emailConfig);
      this.isConfigured = true;
      console.info('Email service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize email service:', error);
      this.isConfigured = false;
    }
  }

  private async verifyConnection(): Promise<boolean> {
    if (!this.transporter || !this.isConfigured) {
      return false;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Email service connection verification failed:', error);
      return false;
    }
  }

  private generatePasswordResetTemplate(resetLink: string, userEmail: string): EmailTemplate {
    const appName = process.env.NEXT_PUBLIC_APP_NAME || 'StudIQ';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset - ${appName}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${appName}</h1>
          <p>Password Reset Request</p>
        </div>
        <div class="content">
          <h2>Reset Your Password</h2>
          <p>Hello,</p>
          <p>We received a request to reset the password for your ${appName} account associated with <strong>${userEmail}</strong>.</p>
          <p>Click the button below to reset your password:</p>
          <a href="${resetLink}" class="button">Reset Password</a>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; background: #f0f0f0; padding: 10px; border-radius: 3px;">${resetLink}</p>
          
          <div class="warning">
            <strong>Important Security Information:</strong>
            <ul>
              <li>This link will expire in 15 minutes for your security</li>
              <li>If you didn't request this password reset, please ignore this email</li>
              <li>Never share this link with anyone</li>
              <li>${appName} will never ask for your password via email</li>
            </ul>
          </div>
          
          <p>If you're having trouble clicking the button, you can also visit our <a href="${appUrl}/auth/forgot-password">password reset page</a> and request a new link.</p>
        </div>
        <div class="footer">
          <p>This email was sent by ${appName}. If you have any questions, please contact our support team.</p>
          <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    const text = `
      ${appName} - Password Reset Request

      Hello,

      We received a request to reset the password for your ${appName} account associated with ${userEmail}.

      To reset your password, please visit the following link:
      ${resetLink}

      IMPORTANT SECURITY INFORMATION:
      - This link will expire in 15 minutes for your security
      - If you didn't request this password reset, please ignore this email
      - Never share this link with anyone
      - ${appName} will never ask for your password via email

      If you're having trouble with the link, you can visit ${appUrl}/auth/forgot-password and request a new link.

      If you have any questions, please contact our support team.

      © ${new Date().getFullYear()} ${appName}. All rights reserved.
    `;

    return {
      subject: `Reset Your ${appName} Password`,
      html,
      text,
    };
  }

  private async sendEmailWithRetry(options: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
    const maxRetries = options.retries || 3;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (!this.transporter) {
          throw new Error('Email transporter not initialized');
        }

        const result = await this.transporter.sendMail({
          from: `"${process.env.NEXT_PUBLIC_APP_NAME || 'StudIQ'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
        });

        console.info(`Email sent successfully to ${options.to} (attempt ${attempt}/${maxRetries})`);
        return { success: true };

      } catch (error) {
        lastError = error;
        console.error(`Email send attempt ${attempt}/${maxRetries} failed:`, error);

        if (attempt < maxRetries) {
          // Wait before retrying (exponential backoff)
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    console.error(`Failed to send email to ${options.to} after ${maxRetries} attempts:`, lastError);
    return { 
      success: false, 
      error: lastError?.message || 'Failed to send email after multiple attempts'
    };
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isConfigured) {
        console.error('Email service not configured');
        return { 
          success: false, 
          error: 'Email service not configured. Please check SMTP settings.' 
        };
      }

      // Verify connection before sending
      const connectionValid = await this.verifyConnection();
      if (!connectionValid) {
        return { 
          success: false, 
          error: 'Email service connection failed. Please try again later.' 
        };
      }

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const resetLink = `${appUrl}/auth/reset-password?token=${resetToken}`;
      
      const template = this.generatePasswordResetTemplate(resetLink, email);

      const result = await this.sendEmailWithRetry({
        to: email,
        subject: template.subject,
        html: template.html,
        text: template.text,
        retries: 3,
      });

      if (result.success) {
        console.info(`Password reset email sent successfully to: ${email}`);
      } else {
        console.error(`Failed to send password reset email to: ${email}, error: ${result.error}`);
      }

      return result;

    } catch (error) {
      console.error('Unexpected error in sendPasswordResetEmail:', error);
      return { 
        success: false, 
        error: 'An unexpected error occurred while sending the email'
      };
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isConfigured) {
        return { 
          success: false, 
          error: 'Email service not configured'
        };
      }

      const connectionValid = await this.verifyConnection();
      return { 
        success: connectionValid,
        error: connectionValid ? undefined : 'Connection verification failed'
      };

    } catch (error) {
      console.error('Email connection test failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Connection test failed'
      };
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();

// Export types for use in other files
export type { SendEmailOptions, EmailTemplate };