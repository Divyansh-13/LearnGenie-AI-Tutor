import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LearnGenie AI Tutor",
  description: "An AI Voice Tutor for Children",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* The body tag is now empty, so it will correctly use the 'Nunito' font from globals.css */}
      <body>
        {children}
      </body>
    </html>
  );
}