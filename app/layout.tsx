import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SupplyPulse — AI Supply Chain Crisis Management",
  description:
    "Turn supply chain disasters into 3-minute resolved incidents. AI-powered disruption response for Nigerian SMEs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#020817] text-white antialiased">{children}</body>
    </html>
  );
}
