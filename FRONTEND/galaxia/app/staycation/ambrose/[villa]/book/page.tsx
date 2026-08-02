import { Suspense } from "react";
import { getAmbroseVilla, getAllAmbroseVillaSlugs, PropertyData } from "../../../../data/properties";
import BookingClient from "../../../[property]/book/BookingClient";
import { notFound } from "next/navigation";

export async function generateStaticParams() {
    return getAllAmbroseVillaSlugs().map((slug) => ({ villa: slug }));
}

export default async function AmbroseVillaBookingPage(props: { params: Promise<{ villa: string }> }) {
    const params = await props.params;
    const data = getAmbroseVilla(params.villa);

    if (!data) {
        notFound();
    }

    // Build a PropertyData-like object for the booking client
    const villaProperty: PropertyData = {
        ...data.parent,
        id: `ambrose/${data.villa.id}`,
        name: data.villa.name,
        subtitle: data.villa.theme,
        description: data.villa.description,
        images: [data.villa.image, ...data.parent.images.slice(1, 4)],
        maxPersons: data.villa.maxPersons || data.parent.maxPersons,
        maxAdults: data.villa.maxAdults ?? data.parent.maxAdults,
        maxKids: data.villa.maxKids ?? data.parent.maxKids,
        pricing: {
            ...data.parent.pricing,
            weekday: data.villa.pricing?.weekday || data.parent.pricing.weekday,
            weekend: data.villa.pricing?.weekend || data.parent.pricing.weekend,
            saturday: data.villa.pricing?.saturday || data.parent.pricing.saturday,
            dateOverrides: data.villa.pricing?.dateOverrides || data.parent.pricing.dateOverrides || {},
        },
        subProperties: undefined, // Single villa, no sub-properties
    };

    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-[#C4A265] border-t-transparent rounded-full" /></div>}>
            <BookingClient property={villaProperty} />
        </Suspense>
    );
}
