import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "SupplyPulse — AI Supply Chain Crisis Management",
  description:
    "Turn supply chain disasters into 3-minute resolved incidents. AI-powered disruption response for Nigerian SMEs.",
  keywords: ["supply chain", "AI agent", "Nigerian SME", "procurement", "MongoDB", "Gemini"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased" style={{ background: "var(--bg)", color: "var(--text)" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
