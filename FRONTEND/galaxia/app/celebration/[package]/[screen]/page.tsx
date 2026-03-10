import { getPackage, getScreen, getAllPackageSlugs, getAllScreenSlugs } from "../../../data/celebrations";
import ScreenDetailClient from "./ScreenDetailClient";
import { notFound } from "next/navigation";

export async function generateStaticParams() {
    const params: { package: string; screen: string }[] = [];
    for (const pkg of getAllPackageSlugs()) {
        for (const scr of getAllScreenSlugs()) {
            params.push({ package: pkg, screen: scr });
        }
    }
    return params;
}

export default async function ScreenPage(props: { params: Promise<{ package: string; screen: string }> }) {
    const params = await props.params;
    const pkg = getPackage(params.package);
    const screen = getScreen(params.screen);

    if (!pkg || !screen) {
        notFound();
    }

    return <ScreenDetailClient pkg={pkg} screen={screen} />;
}
