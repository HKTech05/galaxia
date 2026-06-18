import HospitalityEMenuPage from "../page";

interface PageProps {
    params: Promise<{ villa: string }>;
}

export default async function HospitalityEMenuVillaPage({ params }: PageProps) {
    const resolvedParams = await params;
    return <HospitalityEMenuPage overrideVilla={resolvedParams.villa} />;
}
