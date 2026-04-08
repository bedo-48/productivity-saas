import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationEmail(toEmail, code) {
  try {
    await resend.emails.send({
      from: "TaskFlow <onboarding@resend.dev>",
      to: toEmail,
      subject: "Your TaskFlow verification code",
      html: `
        <div style="font-family: Arial; padding: 30px; max-width: 480px">
          <h2>Verify your email</h2>
          <p>Use this 6-digit code to verify your account.</p>
          <div style="background:#f3f4f6;border-radius:8px;padding:20px;text-align:center;margin:20px 0">
            <h1 style="letter-spacing:10px;font-size:36px;color:#111">${code}</h1>
          </div>
          <p>This code expires in 10 minutes.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Email send failed:", err);
  }
}

export async function sendLoginCodeEmail(toEmail, code) {
  try {
    await resend.emails.send({
      from: "TaskFlow <onboarding@resend.dev>",
      to: toEmail,
      subject: "Your TaskFlow sign-in code",
      html: `
        <div style="font-family: Arial; padding: 30px; max-width: 480px">
          <h2>Finish signing in</h2>
          <p>Enter this 6-digit code to continue signing in to TaskFlow.</p>
          <div style="background:#f3f4f6;border-radius:8px;padding:20px;text-align:center;margin:20px 0">
            <h1 style="letter-spacing:10px;font-size:36px;color:#111">${code}</h1>
          </div>
          <p>This code expires in 10 minutes.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Login code email failed:", err);
    throw err;
  }
}

export async function sendPasswordResetEmail(toEmail, code) {
  try {
    await resend.emails.send({
      from: "TaskFlow <onboarding@resend.dev>",
      to: toEmail,
      subject: "Reset your TaskFlow password",
      html: `
        <div style="font-family: Arial; padding: 30px; max-width: 480px">
          <h2 style="color:#6366f1">Reset your password</h2>
          <p>Use this code to reset your password. It expires in 10 minutes.</p>
          <div style="background:#f3f4f6;border-radius:8px;padding:20px;text-align:center;margin:20px 0">
            <h1 style="letter-spacing:10px;font-size:36px;color:#111">${code}</h1>
          </div>
          <p style="color:#6b7280;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Password reset email failed:", err);
    throw err;
  }
}

export async function sendTaskSharedEmail(toEmail, sharedByName, taskTitle) {
  try {
    await resend.emails.send({
      from: "TaskFlow <onboarding@resend.dev>",
      to: toEmail,
      subject: `${sharedByName} shared a task with you`,
      html: `
        <div style="font-family: Arial; padding: 30px">
          <h2>New shared task</h2>
          <p><strong>${sharedByName}</strong> shared the task <strong>"${taskTitle}"</strong> with you.</p>
          <p>Log in to TaskFlow to collaborate.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Shared task email failed:", err);
  }
}
