import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/context/ThemeContext";
import { InstitutionProvider } from "@/context/InstitutionContext";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "AURA — Academic ERP for Educational Institutions",
    template: "%s | AURA",
  },
  description:
    "AURA is a modern Academic ERP platform built for colleges, universities and vocational institutes. Manage timetables, assessments, exams, finance, staff and student portals — with built-in NAAC, NIRF and accreditation compliance.",
  keywords: [
    "academic ERP", "college management software", "university ERP",
    "NAAC compliance software", "NIRF ranking software", "educational institution management",
    "student portal", "staff portal", "timetable software", "exam management",
    "fee management software", "multi-tenant ERP", "higher education software",
  ],
  authors: [{ name: "AURA Platform" }],
  creator: "AURA Platform",
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "en_US",
    title: "AURA — Academic ERP for Educational Institutions",
    description:
      "One platform for timetables, assessments, exams, finance, portals and accreditation. Built for colleges and universities worldwide.",
    siteName: "AURA Platform",
  },
  twitter: {
    card: "summary_large_image",
    title: "AURA — Academic ERP for Educational Institutions",
    description:
      "One platform for timetables, assessments, exams, finance, portals and accreditation. Built for colleges and universities worldwide.",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || "";

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body suppressHydrationWarning className="font-sans min-h-screen flex flex-col">
        <ThemeProvider>
          <InstitutionProvider userId={userId}>{children}</InstitutionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

