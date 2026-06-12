import type { Metadata } from "next";
import "./globals.css";
import SupportBubble from "@/components/SupportBubble";

export const metadata: Metadata = {
  title: "1rst Bank",
  description: "Your premier banking experience",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <SupportBubble />
      </body>
    </html>
  );
}
