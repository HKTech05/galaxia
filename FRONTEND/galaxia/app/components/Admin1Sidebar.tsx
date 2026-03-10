import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    CalendarDays,
    LogOut,
    Menu,
    X
} from "lucide-react";
import { useState } from "react";

const navigationParams = [
    { name: "Digital Diaries Dashboard", href: "/admin1", icon: LayoutDashboard },
    { name: "Digital Diaries Bookings", href: "/admin1/bookings", icon: CalendarDays }
];

export default function Admin1Sidebar() {
    const pathname = usePathname();
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsMobileOpen(!isMobileOpen)}
                className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-sm border border-slate-200 text-slate-600 hover:text-indigo-600 transition-colors"
            >
                {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {isMobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            <aside
                className={`fixed top-0 left-0 z-40 h-screen w-72 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${isMobileOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
                style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
            >
                <div className="h-20 flex items-center px-8 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <img src="/logos/digital-diaries.png" alt="Digital Diaries Logo" className="h-10 w-auto object-contain" />
                        <div>
                            <h1 className="font-bold text-xl text-slate-800 tracking-tight leading-none">Galaxia</h1>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Digital Diaries</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 px-4 py-8 overflow-y-auto space-y-2">
                    {navigationParams.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={() => setIsMobileOpen(false)}
                                className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                    ? "bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100"
                                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                    }`}
                            >
                                <Icon
                                    size={20}
                                    className={isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600 transition-colors"}
                                />
                                <span className={`font-medium text-[15px] ${isActive ? "font-semibold" : ""}`}>
                                    {item.name}
                                </span>

                                {isActive && (
                                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.8)]" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-slate-100 mb-4">
                    <button className="flex items-center gap-4 px-4 py-3 w-full rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors group">
                        <LogOut size={20} className="text-slate-400 group-hover:text-red-500 transition-colors" />
                        <span className="font-medium text-[15px]">Log Out</span>
                    </button>
                </div>
            </aside>
        </>
    );
}
