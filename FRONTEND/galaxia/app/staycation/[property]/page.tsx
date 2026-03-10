import { notFound } from "next/navigation";
import { getProperty, getAllPropertySlugs } from "../../data/properties";
import PropertyDetailClient from "./PropertyDetailClient";

export async function generateStaticParams() {
    return getAllPropertySlugs().map((slug) => ({ property: slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ property: string }> }) {
    const { property: slug } = await params;
    const property = getProperty(slug);
    if (!property) return { title: "Property Not Found" };
    return {
        title: `${property.name} — ${property.subtitle} | Galaxia Staycation`,
        description: property.description,
    };
}

export default async function PropertyPage({ params }: { params: Promise<{ property: string }> }) {
    const { property: slug } = await params;
    const property = getProperty(slug);
    if (!property) notFound();
    return <PropertyDetailClient property={property} />;
}
