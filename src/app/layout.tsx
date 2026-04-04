import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Youtube Thing",
  description: "YouTube live chat, but simpler. Paste any channel or livestream URL to get started.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='%23FF0000'/><polygon points='13,9 13,23 24,16' fill='white'/></svg>",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0e0e10]">{children}</body>
    </html>
  );
}
