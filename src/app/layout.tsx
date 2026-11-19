import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";

import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";
import { TRPCReactProvider } from "@/trpc/client";

import "./globals.css";

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
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        {/* The theme toggle cross-fades the whole page, so elements do not
            also run their own colour transitions inside it. */}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TRPCReactProvider>
            <div className="mx-auto flex min-h-svh w-full max-w-2xl flex-col px-4">
              <SiteHeader />
              <main className="flex flex-1 flex-col pt-4 pb-6 sm:pt-8">
                {children}
              </main>
            </div>
          </TRPCReactProvider>
          {/* Mounted once here, so any page can call `toast()`. */}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
