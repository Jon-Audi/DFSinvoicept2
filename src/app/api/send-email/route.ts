import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { apiLogger } from '@/lib/logger';

// Initialize Resend only if API key is available
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Validate email configuration
const FROM_EMAIL = process.env.FROM_EMAIL;
if (process.env.NODE_ENV === 'production' && !FROM_EMAIL) {
  apiLogger.warn('FROM_EMAIL not configured for email service in production');
}

export async function POST(request: NextRequest) {
  try {
    // Check if Resend is configured
    if (!resend) {
      apiLogger.error('Email service not configured - RESEND_API_KEY missing');
      return NextResponse.json(
        { error: 'Email service not configured. Please add RESEND_API_KEY to environment variables.' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { to, subject, html, attachments } = body;

    if (!to || !subject || !html) {
      apiLogger.warn('Missing required email fields', { action: 'send_email', hasTo: !!to, hasSubject: !!subject, hasHtml: !!html });
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, html' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!isValidEmail(to)) {
      apiLogger.warn('Invalid email format', { action: 'send_email' });
      return NextResponse.json(
        { error: 'Invalid recipient email address' },
        { status: 400 }
      );
    }

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL || 'noreply@example.com',
      to,
      subject,
      html,
      attachments,
    });

    if (error) {
      apiLogger.error('Resend email send failed', error as Error, { action: 'send_email', to });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    apiLogger.info('Email sent successfully', { action: 'send_email', emailId: data?.id });
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    apiLogger.error('Email API error', error as Error, { action: 'send_email' });
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}

/**
 * Simple email validation
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
