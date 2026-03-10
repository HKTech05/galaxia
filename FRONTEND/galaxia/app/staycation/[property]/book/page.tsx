import { Suspense } from "react";
import { getProperty, getAllPropertySlugs } from "../../../data/properties";
import BookingClient from "./BookingClient";
import { notFound } from "next/navigation";

export async function generateStaticParams() {
    return getAllPropertySlugs().map((slug) => ({ property: slug }));
}

export default async function BookingPage(props: { params: Promise<{ property: string }> }) {
    const params = await props.params;
    const property = getProperty(params.property);

    if (!property) {
        notFound();
    }

    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-[#C4A265] border-t-transparent rounded-full" /></div>}>
            <BookingClient property={property} />
        </Suspense>
    );
}
