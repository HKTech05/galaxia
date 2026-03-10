import { getAmstelNestCottage, getAllAmstelNestCottageSlugs } from "../../../data/properties";
import AmstelNestCottageClient from "./AmstelNestCottageClient";
import { notFound } from "next/navigation";

export async function generateStaticParams() {
    return getAllAmstelNestCottageSlugs().map((slug) => ({ cottage: slug }));
}

export default async function AmstelNestCottagePage(props: { params: Promise<{ cottage: string }> }) {
    const params = await props.params;
    const data = getAmstelNestCottage(params.cottage);

    if (!data) {
        notFound();
    }

    return <AmstelNestCottageClient parent={data.parent} cottage={data.cottage} />;
}
