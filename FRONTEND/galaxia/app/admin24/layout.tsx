import StaycationSidebar from "../components/StaycationSidebar";

export const metadata = {
    title: 'Paraiso & Views Admin | Galaxia',
    description: 'Staycation Receptionist Portal for La Paraiso, Mount View, and Hill View',
}

export default function Admin24Layout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex h-screen overflow-hidden bg-slate-50 admin-theme" style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
            <StaycationSidebar basePath="/admin24" propertyName="Views & Paraiso" />
            <main className="flex-1 lg:ml-72 flex flex-col h-screen overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 md:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
