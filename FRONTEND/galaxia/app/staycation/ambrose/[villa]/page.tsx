import { getAmbroseVilla, getAllAmbroseVillaSlugs } from "../../../data/properties";
import AmbroseVillaClient from "./AmbroseVillaClient";
import { notFound } from "next/navigation";

export async function generateStaticParams() {
    return getAllAmbroseVillaSlugs().map((slug) => ({ villa: slug }));
}

export default async function AmbroseVillaPage(props: { params: Promise<{ villa: string }> }) {
    const params = await props.params;
    const data = getAmbroseVilla(params.villa);

    if (!data) {
        notFound();
    }

    return <AmbroseVillaClient parent={data.parent} villa={data.villa} />;
}
