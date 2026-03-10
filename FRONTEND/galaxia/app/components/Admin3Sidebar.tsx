"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export default function Admin3Sidebar() {
    const pathname = usePathname();
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const navItems = [
        { name: "EUPHORIA", href: "/admin3/euphoria" },
        { name: "VIEWS & LA PARAISO", href: "/admin3/views-paraiso" },
        { name: "AMBROSE", href: "/admin3/ambrose" },
        { name: "AMSTEL NEST", href: "/admin3/amstel" },
    ];

    return (
        <>
            <button
                onClick={() => setIsMobileOpen(!isMobileOpen)}
                className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-sm border border-slate-200 text-slate-800"
            >
                {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {isMobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            <aside
                className={`fixed top-0 left-0 z-40 h-screen w-64 bg-white border-r border-black text-black flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${isMobileOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
                style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
            >
                <div className="flex-1 py-24 px-8 space-y-8 flex flex-col justify-start items-center">
                    <nav className="space-y-6 flex flex-col items-center">
                        {navItems.map((item) => {
                            const isActive = pathname.startsWith(item.href);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsMobileOpen(false)}
                                    className={`block text-xs md:text-sm font-bold tracking-[0.15em] transition-all duration-200 text-center ${isActive
                                            ? "border border-black px-4 py-2 w-fit"
                                            : "text-black hover:opacity-70 px-4 py-2 w-fit"
                                        }`}
                                >
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            </aside>
        </>
    );
}
