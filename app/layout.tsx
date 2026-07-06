import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Маркетинговый агент — турагентство",
  description: "Платформа управления маркетинговым агентом: контент, публикации, аналитика",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
