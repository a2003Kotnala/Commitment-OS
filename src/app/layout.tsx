import type { Metadata } from "next";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "AI Commitment OS",
  description:
    "Commitment Intelligence Platform for capturing and executing on conversational work."
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
