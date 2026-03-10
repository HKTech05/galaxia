import { Bell, Search, User } from "lucide-react";

export default function Admin1Header() {
    return (
        <header className="h-20 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 ml-0 lg:ml-72" style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>

            <div className="flex-1 sm:hidden ml-12">
                <h2 className="font-bold text-lg text-slate-800 tracking-tight">Galaxia</h2>
            </div>

            <div className="flex items-center gap-4 sm:gap-6">
                <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 rounded-full hover:bg-slate-100">
                    <Bell size={20} />
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 border border-white"></span>
                </button>

                <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>

                <button className="flex items-center gap-3 hover:bg-slate-50 p-1.5 pr-3 rounded-full transition-colors border border-transparent hover:border-slate-200">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center overflow-hidden">
                        <User size={18} className="text-indigo-600" />
                    </div>
                    <div className="text-left hidden md:block">
                        <p className="text-[13px] font-bold text-slate-800 leading-tight">DD Staff</p>
                        <p className="text-[11px] font-medium text-slate-500">Digital Diaries</p>
                    </div>
                </button>
            </div>
        </header>
    );
}
