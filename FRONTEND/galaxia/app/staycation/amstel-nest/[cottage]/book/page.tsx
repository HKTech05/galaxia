import { Suspense } from "react";
import { getAmstelNestCottage, getAllAmstelNestCottageSlugs, PropertyData } from "../../../../data/properties";
import BookingClient from "../../../[property]/book/BookingClient";
import { notFound } from "next/navigation";

export async function generateStaticParams() {
    return getAllAmstelNestCottageSlugs().map((slug) => ({ cottage: slug }));
}

export default async function AmstelNestCottageBookingPage(props: { params: Promise<{ cottage: string }> }) {
    const params = await props.params;
    const data = getAmstelNestCottage(params.cottage);

    if (!data) {
        notFound();
    }

    // Build a PropertyData-like object for the booking client
    const cottageProperty: PropertyData = {
        ...data.parent,
        id: `amstel-nest/${data.cottage.id}`,
        name: data.cottage.name,
        subtitle: data.cottage.theme,
        description: data.cottage.description,
        images: [data.cottage.image, ...data.parent.images.slice(1, 4)],
        maxPersons: data.cottage.maxPersons || data.parent.maxPersons,
        pricing: {
            ...data.parent.pricing,
            weekday: data.cottage.pricing?.weekday || data.parent.pricing.weekday,
            weekend: data.cottage.pricing?.weekend || data.parent.pricing.weekend,
        },
        subProperties: undefined, // Single cottage, no sub-properties
    };

    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-[#C4A265] border-t-transparent rounded-full" /></div>}>
            <BookingClient property={cottageProperty} />
        </Suspense>
    );
}
