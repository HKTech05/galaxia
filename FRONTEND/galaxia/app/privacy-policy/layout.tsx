import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Galaxia",
  description: "Galaxia's privacy policy explains how we collect, use, and protect your personal information when you use our services.",
};

export default function PrivacyPolicyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
