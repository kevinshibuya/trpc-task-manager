import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";

import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";
import { TRPCReactProvider } from "@/trpc/client";

import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Task manager",
  description: "Create, edit and delete tasks.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // next-themes sets the theme class on <html> before React hydrates, so
    // the server HTML cannot know it. The warning is suppressed for this one
    // element only.
    <html lang="en" className={geist.variable} suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <TRPCReactProvider>
            <div className="mx-auto flex min-h-svh w-full max-w-2xl flex-col px-4">
              <SiteHeader />
              <main className="flex flex-1 flex-col py-6">{children}</main>
            </div>
          </TRPCReactProvider>
          {/* Mounted once here, so any page can call `toast()`. */}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
