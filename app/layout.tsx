import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sunday Sermon Clock",
  description: "Track sermon lengths and guess how long this week's will be!",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
