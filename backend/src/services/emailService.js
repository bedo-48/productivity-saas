import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationEmail(toEmail, code) {
  try {
    await resend.emails.send({
      from: "TaskFlow <onboarding@resend.dev>",
      to: toEmail,
      subject: "Your TaskFlow verification code",
      html: `
        <div style="font-family: Arial; padding: 30px">
          <h2>Verify your email</h2>
          <p>Use this code to verify your account:</p>
          <h1 style="letter-spacing:8px">${code}</h1>
          <p>This code expires in 10 minutes.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Email send failed:", err);
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