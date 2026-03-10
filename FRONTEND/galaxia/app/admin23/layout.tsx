import StaycationSidebar from "../components/StaycationSidebar";

export const metadata = {
    title: 'Ambrose & Amstel Admin | Galaxia',
    description: 'Staycation Receptionist Portal for Ambrose and Amstel Nest',
}

export default function Admin23Layout({
    children,
}: {
    children: React.ReactNode
}) {
    const navItems = [
        { name: "Ambrose Desk", href: "/admin23/ambrose" },
        { name: "Amstel Desk", href: "/admin23/amstel" }
    ];

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50 admin-theme" style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
            <StaycationSidebar basePath="/admin23" propertyName="Ambrose & Amstel" overrideNav={navItems} />
            <main className="flex-1 lg:ml-72 flex flex-col h-screen overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 md:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
