import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EYEVOLVE",
  description: "A satellite intelligence prototype that learns automation from use.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
