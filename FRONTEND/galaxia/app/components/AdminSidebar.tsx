"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    LayoutDashboard,
    CalendarDays,
    Hotel,
    Users,
    MessageSquare,
    Settings,
    LogOut,
    Menu,
    X,
    Film,
    Building,
    ChevronDown,
    Eye,
    Globe,
    BadgeDollarSign,
    Ticket,
    Star,
    ClipboardList,
    Smartphone,
    FileText,
    ScrollText,
    ChefHat
} from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "../../lib/api";

const navigationParams = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Bookings", href: "/admin/bookings", icon: CalendarDays },
    { name: "Properties", href: "/admin/properties", icon: Hotel },
    { name: "Users", href: "/admin/users", icon: Users },
    { name: "Chatbot", href: "/admin/chatbot", icon: MessageSquare },
    { name: "Settings", href: "/admin/settings", icon: Settings },
];

// Admin3 top-level items (owner/dev only)
const admin3TopItems = [
    { name: "Dashboard", href: "/admin3", icon: LayoutDashboard },
    { name: "Bookings", href: "/admin3/stay-bookings", icon: ClipboardList },
    { name: "Quotation", href: "/admin3/quotation", icon: ScrollText },
];

// Admin3 Daily Checkins dropdown items
const admin3DailyCheckinItems = [
    { name: "Properties", href: "/admin3/properties-view", icon: Building },
    { name: "Digital Diaries", href: "/admin3/dd-view", icon: Film },
];

// Admin3 receptionist desk items — each entry maps to property slugs for filtering
const admin3ReceptionistItems = [
    { name: "Digital Diaries", href: "/admin3/digital-diaries", icon: Film, slugs: ["dd"] },
    { name: "Heavenly Villa & Hill View", href: "/admin3/heavenly-villa", icon: Hotel, slugs: ["heavenly-villa", "hill-view"] },
    { name: "Mount View & La Paraiso", href: "/admin3/views-paraiso", icon: Hotel, slugs: ["mount-view", "la-paraiso"] },
    { name: "Ambrose", href: "/admin3/ambrose", icon: Hotel, slugs: ["ambrose"] },
    { name: "Amstel Nest", href: "/admin3/amstel", icon: Hotel, slugs: ["amstel-nest"] },
];

// Admin3 bottom items (owner/dev only)
const admin3BottomItems = [
    { name: "Cash Management", href: "/admin3/employees", icon: BadgeDollarSign },
    { name: "UPI Management", href: "/admin3/upi-management", icon: Smartphone },
    { name: "Coupons", href: "/admin3/coupons", icon: Ticket },
    { name: "Properties", href: "/admin3/properties-mgmt", icon: Building },
    { name: "Users", href: "/admin3/users", icon: Users },
    { name: "Reviews", href: "/admin3/reviews", icon: Star },
    { name: "Reports", href: "/admin3/reports", icon: FileText },
    { name: "Photo Manager", href: "/admin3/website-view", icon: Globe },
    { name: "Settings", href: "/admin3/settings", icon: Settings },
];

export default function AdminSidebar({ isAdmin3 = false }: { isAdmin3?: boolean }) {
    const pathname = usePathname();
    const router = useRouter();
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [receptionistOpen, setReceptionistOpen] = useState(false);
    const [dailyCheckinsOpen, setDailyCheckinsOpen] = useState(false);

    // Admin profile for property-scoped access
    const [assignedProperties, setAssignedProperties] = useState<string[] | null>(null);
    const [adminRole, setAdminRole] = useState<string>("");
    const [adminDisplayName, setAdminDisplayName] = useState<string>("");
    const [profileLoaded, setProfileLoaded] = useState(false);

    useEffect(() => {
        if (!isAdmin3) return;
        api.get("/auth/me").then(data => {
            setAdminRole(data?.role || "");
            setAdminDisplayName(data?.displayName || "");
            setAssignedProperties(data?.assignedProperties || null);
            setProfileLoaded(true);
        }).catch(() => { setProfileLoaded(true); });
    }, [isAdmin3]);

    // Full access = owner, developer, or null assignedProperties
    const hasFullAccess = !assignedProperties || adminRole === "owner" || adminRole === "developer";

    // Filter receptionist items by assigned property slugs
    const visibleReceptionistItems = hasFullAccess
        ? admin3ReceptionistItems
        : admin3ReceptionistItems.filter(item =>
            item.slugs.some(s => assignedProperties!.includes(s))
        );

    const isReceptionistActive = visibleReceptionistItems.some(item => pathname.startsWith(item.href));
    const isDailyCheckinsActive = admin3DailyCheckinItems.some(item => pathname.startsWith(item.href));

    const handleLogout = () => {
        localStorage.removeItem("galaxia_token");
        document.cookie = "admin_token=; path=/; max-age=0; samesite=strict";
        router.push("/login");
    };

    const renderNavItem = (item: { name: string; href: string; icon: any }, nested = false) => {
        const isActive = item.href === "/admin3" ? pathname === item.href : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
            <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center gap-4 ${nested ? 'px-4 py-2.5 ml-4 border-l-2' : 'px-4 py-3'} rounded-xl transition-all duration-200 group ${isActive
                    ? `bg-purple-50 text-purple-700 shadow-sm shadow-purple-100 ${nested ? 'border-purple-400' : ''}`
                    : `text-slate-500 hover:bg-slate-50 hover:text-slate-900 ${nested ? 'border-slate-200 hover:border-slate-400' : ''}`
                    }`}
            >
                <Icon
                    size={nested ? 16 : 20}
                    className={isActive ? "text-purple-600" : "text-slate-400 group-hover:text-slate-600 transition-colors"}
                />
                <span className={`font-medium ${nested ? 'text-[13px]' : 'text-[15px]'} ${isActive ? "font-semibold" : ""}`}>
                    {item.name}
                </span>
                {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-600 shadow-[0_0_8px_rgba(124,58,237,0.8)]" />
                )}
            </Link>
        );
    };

    // Non-admin3 mode
    const navItems = navigationParams;

    return (
        <>
            {/* Mobile Toggle Button */}
            <button
                onClick={() => setIsMobileOpen(!isMobileOpen)}
                className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-sm border border-slate-200 text-slate-600 hover:text-purple-600 transition-colors"
            >
                {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Backdrop for mobile */}
            {isMobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Sidebar Container */}
            <aside
                className={`fixed top-0 left-0 z-40 h-screen w-72 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${isMobileOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
                style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
            >
                {/* Brand Area */}
                <div className="h-20 flex items-center px-8 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        {!isAdmin3 && (
                            <img src="/logos/digital-diaries.png" alt="Digital Diaries Logo" className="h-10 w-auto object-contain" />
                        )}
                        <div>
                            <h1 className="font-bold text-xl text-slate-800 tracking-tight leading-none">Galaxia</h1>
                            <p className="text-[11px] text-slate-400 font-medium uppercase tracking-widest mt-1">{isAdmin3 ? (hasFullAccess ? "Owner Panel" : "Digital Diaries") : "Admin Panel"}</p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-8 overflow-y-auto space-y-1">
                    {isAdmin3 ? (
                        <>
                            {adminRole === "chef" ? (
                                <>
                                    {renderNavItem({ name: "Chef", href: "/admin3/chef", icon: ChefHat })}
                                </>
                            ) : (
                                <>
                                    {/* Owner/Dev only: Dashboard, Bookings, Quotation */}
                                    {hasFullAccess && (
                                        <>
                                            {renderNavItem(admin3TopItems[0])}
                                            {renderNavItem(admin3TopItems[1])}
                                            {renderNavItem(admin3TopItems[2])}
                                        </>
                                    )}

                                    {/* Owner/Dev only: Daily Checkins */}
                                    {hasFullAccess && (
                                        <>
                                            <button
                                                onClick={() => setDailyCheckinsOpen(!dailyCheckinsOpen)}
                                                className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 w-full text-left group ${isDailyCheckinsActive && !dailyCheckinsOpen
                                                    ? "bg-purple-50 text-purple-700"
                                                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                                    }`}
                                            >
                                                <CalendarDays size={20} className={isDailyCheckinsActive ? "text-purple-600" : "text-slate-400 group-hover:text-slate-600 transition-colors"} />
                                                <span className={`font-medium text-[15px] flex-1 ${isDailyCheckinsActive ? "font-semibold" : ""}`}>
                                                    Daily Checkins
                                                </span>
                                                <ChevronDown
                                                    size={16}
                                                    className={`transition-transform duration-200 ${dailyCheckinsOpen ? "rotate-180" : ""} ${isDailyCheckinsActive ? "text-purple-500" : "text-slate-400"}`}
                                                />
                                            </button>
                                            {dailyCheckinsOpen && (
                                                <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                                                    {admin3DailyCheckinItems.map(item => renderNavItem(item, true))}
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* Receptionist Section */}
                                    {hasFullAccess ? (
                                        <>
                                            {/* Owner/Dev: collapsible dropdown */}
                                            <button
                                                onClick={() => setReceptionistOpen(!receptionistOpen)}
                                                className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 w-full text-left group ${isReceptionistActive && !receptionistOpen
                                                    ? "bg-purple-50 text-purple-700"
                                                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                                    }`}
                                            >
                                                <Eye size={20} className={isReceptionistActive ? "text-purple-600" : "text-slate-400 group-hover:text-slate-600 transition-colors"} />
                                                <span className={`font-medium text-[15px] flex-1 ${isReceptionistActive ? "font-semibold" : ""}`}>
                                                    Receptionist View
                                                </span>
                                                <ChevronDown
                                                    size={16}
                                                    className={`transition-transform duration-200 ${receptionistOpen ? "rotate-180" : ""} ${isReceptionistActive ? "text-purple-500" : "text-slate-400"}`}
                                                />
                                            </button>
                                            {receptionistOpen && (
                                                <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                                                    {visibleReceptionistItems.map(item => renderNavItem(item, true))}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        /* Sub-admins: show items directly, no dropdown */
                                        visibleReceptionistItems.map(item => renderNavItem(item))
                                    )}

                                    {/* Owner/Dev only: Chef Portal Link */}
                                    {hasFullAccess && renderNavItem({ name: "Chef", href: "/admin3/chef", icon: ChefHat })}

                                    {/* Owner/Dev only: Bottom items */}
                                    {hasFullAccess && admin3BottomItems.map(item => renderNavItem(item))}
                                </>
                            )}
                        </>
                    ) : (
                        navItems.map((item) => {
                            const isActive = pathname === item.href;
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={() => setIsMobileOpen(false)}
                                    className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                        ? "bg-purple-50 text-purple-700 shadow-sm shadow-purple-100"
                                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                        }`}
                                >
                                    <Icon
                                        size={20}
                                        className={isActive ? "text-purple-600" : "text-slate-400 group-hover:text-slate-600 transition-colors"}
                                    />
                                    <span className={`font-medium text-[15px] ${isActive ? "font-semibold" : ""}`}>
                                        {item.name}
                                    </span>
                                    {isActive && (
                                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-600 shadow-[0_0_8px_rgba(124,58,237,0.8)]" />
                                    )}
                                </Link>
                            );
                        })
                    )}
                </nav>

                {/* Bottom Area (Logout) */}
                <div className="p-4 border-t border-slate-100 flex flex-col gap-2 mb-4">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-4 px-4 py-3 w-full rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors group"
                    >
                        <LogOut size={20} className="text-slate-400 group-hover:text-red-500 transition-colors" />
                        <span className="font-medium text-[15px]">Log Out</span>
                    </button>
                </div>
            </aside>
        </>
    );
}
