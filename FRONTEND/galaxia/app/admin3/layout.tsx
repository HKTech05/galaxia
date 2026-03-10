import AdminSidebar from "../components/AdminSidebar";
import AdminHeader from "../components/AdminHeader";

export const metadata = {
    title: 'Owner Dashboard | Galaxia',
    description: 'Staycation Owner Portal',
}

export default function Admin3Layout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="admin-theme h-screen w-full overflow-y-auto bg-slate-50 flex flex-col selection:bg-purple-100 selection:text-purple-900 font-manrope">
            <AdminSidebar isAdmin3={true} />
            <AdminHeader />
            <main className="flex-1 ml-0 lg:ml-72 p-4 sm:p-8 overflow-x-hidden">
                {children}
            </main>
        </div>
    );
}
