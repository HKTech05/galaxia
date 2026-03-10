"use client";

import Admin1Sidebar from "../components/Admin1Sidebar";
import Admin1Header from "../components/Admin1Header";

export default function Admin1Layout({ children }: { children: React.ReactNode }) {
    return (
        <div className="admin-theme h-screen w-full overflow-y-auto bg-slate-50 flex flex-col selection:bg-indigo-100 selection:text-indigo-900" style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
            <Admin1Sidebar />
            <Admin1Header />
            <main className="flex-1 ml-0 lg:ml-72 p-4 sm:p-8 overflow-x-hidden">
                {children}
            </main>
        </div>
    );
}
