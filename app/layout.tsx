import type { Metadata } from "next";
import { AuthProvider } from "../components/auth-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "VolleyMetrics — Volleyball Performance Tracker",
  description: "Phân tích hiệu suất thi đấu bóng chuyền sau trận dành cho đội bóng và CLB.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body><AuthProvider>{children}</AuthProvider></body>
    </html>
  );
}
