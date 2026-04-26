import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AISEC Next Migration",
  description: "Next.js, Trigger.dev, and Supabase migration workspace for AISEC",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
