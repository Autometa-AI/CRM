import "./globals.css";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Autometa CRM",
  description: "Lead-gen CRM for UAE real estate",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = headers().get("x-pathname") ?? "";
  const isAuthPage = pathname.startsWith("/login");

  return (
    <html lang="en">
      <body>
        {isAuthPage ? (
          <div className="min-h-screen">{children}</div>
        ) : (
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 min-w-0 p-6 lg:p-8">{children}</main>
          </div>
        )}
      </body>
    </html>
  );
}
