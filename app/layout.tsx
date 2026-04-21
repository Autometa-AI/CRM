import "./globals.css";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { Inter, Fraunces } from "next/font/google";
import { Sidebar } from "@/components/Sidebar";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-serif",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Autometa CRM",
  description: "Lead-gen CRM for UAE real estate",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = headers().get("x-pathname") ?? "";
  const isAuthPage = pathname.startsWith("/login");

  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="font-sans">
        {isAuthPage ? (
          <div className="min-h-screen">{children}</div>
        ) : (
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 min-w-0 p-6 lg:p-10">{children}</main>
          </div>
        )}
      </body>
    </html>
  );
}
