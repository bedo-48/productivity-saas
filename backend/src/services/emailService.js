import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendVerificationEmail(toEmail, code) {
  await transporter.sendMail({
    from: `"TaskFlow" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: "Your TaskFlow verification code",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 32px; background: #f9fafb; border-radius: 12px;">
        <h2 style="color: #111; margin-bottom: 8px;">Verify your email</h2>
        <p style="color: #555; margin-bottom: 24px;">Enter this code in the app to confirm your account:</p>
        <div style="background: #fff; border: 2px solid #6366f1; border-radius: 12px; padding: 24px; text-align: center;">
          <span style="font-size: 40px; font-weight: 800; letter-spacing: 12px; color: #6366f1;">${code}</span>
        </div>
        <p style="color: #999; font-size: 13px; margin-top: 20px;">This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
}

export async function sendTaskSharedEmail(toEmail, sharedByName, taskTitle) {
  await transporter.sendMail({
    from: `"TaskFlow" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: `${sharedByName} shared a task with you`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 32px; background: #f9fafb; border-radius: 12px;">
        <h2 style="color: #111;">New shared task</h2>
        <p style="color: #555;"><strong>${sharedByName}</strong> shared the task <strong>"${taskTitle}"</strong> with you on TaskFlow.</p>
        <p style="color: #999; font-size: 13px; margin-top: 20px;">Log in to view and collaborate on it.</p>
      </div>
    `,
  });
}
