import AdminSidebar from "../../components/AdminSidebar";
import UpiManagementClient from "./UpiManagementClient";

export default function UpiManagementPage() {
    return (
        <div className="flex min-h-screen bg-[#f8f9fc]" style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
            <AdminSidebar isAdmin3 />
            <main className="flex-1 p-6 lg:p-8 lg:ml-72 mt-12 lg:mt-0">
                <UpiManagementClient />
            </main>
        </div>
    );
}
