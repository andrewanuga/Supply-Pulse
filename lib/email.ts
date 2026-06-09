import nodemailer from "nodemailer";

// ─── Gmail SMTP transporter ────────────────────────────────────────────────────
// Uses a Gmail App Password — NOT your regular Gmail password.
// Set up: myaccount.google.com → Security → 2-Step Verification → App passwords
function createTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,   // your.email@gmail.com
      pass: process.env.GMAIL_APP_PASSWORD, // 16-char app password from Google
    },
  });
}

export async function sendVendorEmail({
  to,
  supplierName,
  skus,
  quantity,
  deadline,
  buyerName = "Procurement Officer",
  companyName = "SupplyPulse Client",
}: {
  to: string;
  supplierName: string;
  skus: string[];
  quantity: number;
  deadline: string;
  buyerName?: string;
  companyName?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const transporter = createTransporter();

    const info = await transporter.sendMail({
      from: `"${companyName} via SupplyPulse" <${process.env.GMAIL_USER}>`,
      to,
      subject: `Urgent Supply Request — ${skus.join(", ")} — Needed by ${deadline}`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f1f5f9; border-radius: 12px;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%); padding: 24px 28px; border-radius: 10px; margin-bottom: 20px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 36px; height: 36px; background: rgba(255,255,255,0.15); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                <span style="color: white; font-size: 18px;">⚡</span>
              </div>
              <div>
                <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">SupplyPulse</h1>
                <p style="color: #93c5fd; margin: 2px 0 0; font-size: 13px;">AI-Powered Supply Chain Crisis Management</p>
              </div>
            </div>
          </div>

          <!-- Body -->
          <div style="background: white; padding: 28px; border-radius: 10px; border: 1px solid #e2e8f0; box-shadow: 0 1px 4px rgba(0,0,0,0.06);">
            <p style="color: #1e293b; font-size: 16px; margin: 0 0 16px;">
              Dear <strong style="color: #1d4ed8;">${supplierName}</strong>,
            </p>

            <p style="color: #475569; line-height: 1.7; margin: 0 0 20px;">
              We are reaching out regarding an <strong>urgent procurement need</strong>. Due to a disruption in our
              supply chain, we require your assistance to fulfil the following order on a priority basis.
            </p>

            <!-- Order Details Box -->
            <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 20px; margin: 20px 0; border-radius: 0 10px 10px 0;">
              <h3 style="color: #1e3a8a; margin: 0 0 14px; font-size: 15px; font-weight: 700;">📦 Order Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #dbeafe;">
                  <td style="padding: 10px 0; color: #64748b; font-size: 14px; width: 45%;">Products Required:</td>
                  <td style="padding: 10px 0; color: #1e293b; font-weight: 700; font-size: 14px;">${skus.join(", ")}</td>
                </tr>
                <tr style="border-bottom: 1px solid #dbeafe;">
                  <td style="padding: 10px 0; color: #64748b; font-size: 14px;">Total Quantity:</td>
                  <td style="padding: 10px 0; color: #1e293b; font-weight: 700; font-size: 14px;">${quantity.toLocaleString()} units</td>
                </tr>
                <tr style="border-bottom: 1px solid #dbeafe;">
                  <td style="padding: 10px 0; color: #64748b; font-size: 14px;">Required By:</td>
                  <td style="padding: 10px 0; color: #dc2626; font-weight: 700; font-size: 14px;">🗓 ${deadline}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #64748b; font-size: 14px;">Buyer Contact:</td>
                  <td style="padding: 10px 0; color: #1e293b; font-size: 14px;">${buyerName}, ${companyName}</td>
                </tr>
              </table>
            </div>

            <!-- Urgency notice -->
            <div style="background: #fff7ed; border: 1px solid #fed7aa; padding: 14px 18px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #c2410c; margin: 0; font-size: 14px; font-weight: 600;">
                ⏱ Time-Sensitive Request
              </p>
              <p style="color: #9a3412; margin: 6px 0 0; font-size: 13px; line-height: 1.5;">
                This is a priority order. Please confirm availability, pricing, and earliest delivery date
                at your earliest convenience.
              </p>
            </div>

            <p style="color: #475569; line-height: 1.7; font-size: 14px; margin: 20px 0 0;">
              This procurement request was generated by SupplyPulse AI on behalf of
              <strong>${companyName}</strong> as part of an automated supply chain recovery workflow.
              A member of our procurement team will follow up shortly.
            </p>

            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />

            <p style="color: #334155; margin: 0; font-size: 14px;">
              Best regards,<br />
              <strong style="color: #1e293b;">${buyerName}</strong><br />
              <span style="color: #64748b;">${companyName}</span><br />
              <span style="color: #2563eb; font-size: 13px;">⚡ via SupplyPulse AI Agent</span>
            </p>
          </div>

          <!-- Footer -->
          <div style="text-align: center; margin-top: 18px;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
              Sent via <strong style="color: #2563eb;">SupplyPulse</strong> — AI-Powered Supply Chain Crisis Management
            </p>
            <p style="color: #cbd5e1; font-size: 11px; margin: 4px 0 0;">
              MongoDB Atlas · Gemini · Gmail
            </p>
          </div>
        </div>
      `,
    });

    return { success: true, messageId: info.messageId };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
