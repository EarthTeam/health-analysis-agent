import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/ui/Sidebar";
import { TopBar } from "@/components/ui/TopBar";
import { MobileNav } from "@/components/ui/MobileNav";
import { cn } from "@/lib/utils";
import { StoreProvider } from "@/lib/store";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Recovery Agent",
  description: "Advanced recovery tracking and analysis",
  manifest: "/manifest.json",
  themeColor: "#2563eb",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Recovery Agent",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={cn(inter.className, "bg-background min-h-screen flex selection:bg-primary/20")}>
        <StoreProvider>
          <Sidebar />
          <main className="flex-1 p-4 md:p-8 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-8 overflow-auto h-screen w-full relative">
            <div className="max-w-5xl mx-auto">
              <TopBar />
              {children}
            </div>
          </main>
          <MobileNav />
        </StoreProvider>
      </body>
    </html>
  );
}
