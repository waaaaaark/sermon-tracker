import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sermon Log",
  description: "Sunday sermon duration tracker",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
