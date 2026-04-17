"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginRedirect() {
    const router = useRouter();
    useEffect(() => { router.replace("/login"); }, [router]);
    return (
        <div className="min-h-screen bg-[#111] flex items-center justify-center">
            <p className="text-white/50 text-sm font-inter">Redirecting…</p>
        </div>
    );
}
