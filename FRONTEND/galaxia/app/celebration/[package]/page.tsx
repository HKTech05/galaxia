import { getPackage, getAllPackageSlugs, screens } from "../../data/celebrations";
import PackageDetailClient from "./PackageDetailClient";
import { notFound } from "next/navigation";

export async function generateStaticParams() {
    return getAllPackageSlugs().map((slug) => ({ package: slug }));
}

export default async function PackagePage(props: { params: Promise<{ package: string }> }) {
    const params = await props.params;
    const pkg = getPackage(params.package);

    if (!pkg) {
        notFound();
    }

    return <PackageDetailClient pkg={pkg} screens={Object.values(screens)} />;
}
