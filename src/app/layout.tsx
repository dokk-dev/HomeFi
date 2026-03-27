import type { Metadata } from "next";
import { Manrope, Inter } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { SessionProvider } from "@/components/providers/SessionProvider";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "MyFi — Personal Productivity OS",
  description: "Organize your daily life across CS/AI, Music Tech, Russian, Hebrew, and Career.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${manrope.variable} ${inter.variable} ${geistMono.variable} antialiased bg-surface text-on-surface`}
      >
        {/* Runs synchronously before paint — reads saved theme and removes
            the default `dark` class if the user chose light or auto+light */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var p=JSON.parse(localStorage.getItem('myfi-prefs')||'{}');if(p.theme==='light')document.documentElement.classList.remove('dark');else if(p.theme==='auto'&&!window.matchMedia('(prefers-color-scheme: dark)').matches)document.documentElement.classList.remove('dark')}catch(e){}`,
          }}
        />
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
