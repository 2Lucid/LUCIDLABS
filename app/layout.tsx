
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppSidebar } from "@/components/AppSidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LUCID LABS - Dataset Forge",
  description: "Internal tool for AI dataset generation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} flex min-h-screen bg-background text-foreground antialiased`}>
        <AppSidebar />
        <main className="flex-1 h-screen overflow-y-auto">
          <div className="mx-auto max-w-7xl p-8">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
