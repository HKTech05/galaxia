"use client";

import { Suspense } from "react";
import { RefreshCw } from "lucide-react";
import { EMenuContent } from "../page";

export default function HospitalityEMenuOwnerPage() {
    return (
        <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
            <Suspense fallback={
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                    <RefreshCw size={36} className="animate-spin text-amber-600" />
                    <p className="text-sm font-semibold tracking-wide">Loading menu...</p>
                </div>
            }>
                <EMenuContent disableTimers={true} />
            </Suspense>
        </div>
    );
}
