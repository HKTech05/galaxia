"use client";

import { useState, useEffect } from "react";

/**
 * Fetches fully-booked dates from the backend for a given property/sub-property.
 * Returns a Set<string> of YYYY-MM-DD dates that are fully booked.
 * Covers from today through 18 months ahead — used to disable dates in pickers.
 */
export function useBookedDates(propertyId: number | null | undefined, subPropertyId?: number | null) {
    const [bookedDates, setBookedDates] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!propertyId || propertyId <= 0) {
            setBookedDates(new Set());
            return;
        }

        let cancelled = false;

        (async () => {
            try {
                const now = new Date();
                const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
                // 18 months ahead to cover far-future bookings
                const futureDate = new Date(now.getFullYear(), now.getMonth() + 18, 0);
                const endDate = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}-${String(futureDate.getDate()).padStart(2, '0')}`;

                const baseUrl = typeof window !== "undefined" ? "/api" : "http://localhost:4000/api";
                let url = `${baseUrl}/bookings/staycation/booked-dates?propertyId=${propertyId}&startDate=${startDate}&endDate=${endDate}`;
                if (subPropertyId) url += `&subPropertyId=${subPropertyId}`;

                const res = await fetch(url);
                if (res.ok && !cancelled) {
                    const data = await res.json();
                    setBookedDates(new Set(data.dates || []));
                }
            } catch {
                // Silently fail — calendar will show all dates as available
            }
        })();

        return () => { cancelled = true; };
    }, [propertyId, subPropertyId]);

    return bookedDates;
}
