import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import FloatingChatbot from "./components/FloatingChatbot";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });

export const metadata: Metadata = {
  title: "Galaxia — Premium Experiences",
  description: "Galaxia offers luxury private movie screenings and premium staycation experiences across exclusive resorts and villas.",
  keywords: ["Galaxia", "luxury staycation", "private movie screening", "premium villas", "resort booking", "Karjat"],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${manrope.variable}`}>
      <body className="antialiased font-manrope">
        {children}
        <FloatingChatbot />
      </body>
    </html>
  );
}
