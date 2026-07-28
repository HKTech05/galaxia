import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Delete Account — Galaxia",
  description: "Learn how to request account deletion from Galaxia, what data is removed, and what may be retained for legal compliance.",
};

export default function DeleteAccountLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
