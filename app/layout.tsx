import type { Metadata, Viewport } from "next";
import "./globals.css";
import SupportBubble from "@/components/SupportBubble";
import PwaRegister from "@/components/PwaRegister";

export const metadata: Metadata = {
  title: "1rst Bank",
  description: "Your premier banking experience",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "1rst Bank",
  },
  icons: {
    apple: "/apple-touch-icon.png",
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#003087",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <SupportBubble />
        <PwaRegister />
      </body>
    </html>
  );
}
