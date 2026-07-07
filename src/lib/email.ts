import nodemailer from 'nodemailer';

interface SendNotificationParams {
  parentEmail: string;
  studentName: string;
  eventType: 'in' | 'out';
  timestamp: string;
  busRouteName?: string;
}

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendParentNotification({
  parentEmail,
  studentName,
  eventType,
  timestamp,
  busRouteName,
}: SendNotificationParams): Promise<void> {
  const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER;
  if (!fromEmail) return;

  const subject =
    eventType === 'in'
      ? `🚌 ${studentName} has boarded the bus`
      : `🚌 ${studentName} has exited the bus`;

  const action = eventType === 'in' ? 'boarded' : 'exited';
  const routeInfo = busRouteName ? ` on route "${busRouteName}"` : '';
  const date = new Date(timestamp).toLocaleString();

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <div style="background: #2563eb; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0; font-size: 18px;">Bus Notification</h2>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
        <p style="margin: 0 0 12px; font-size: 16px; color: #374151;">
          Your child <strong>${studentName}</strong> has ${action} the bus${routeInfo}.
        </p>
        <p style="margin: 0 0 4px; font-size: 14px; color: #6b7280;">
          Time: ${date}
        </p>
      </div>
    </div>
  `;

  const transporter = getTransporter();
  await transporter.sendMail({
    from: fromEmail,
    to: parentEmail,
    subject,
    html,
  });
}
