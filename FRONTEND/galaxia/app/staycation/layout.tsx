import StaycationNavbar from "../components/StaycationNavbar";
import StaycationFooter from "../components/StaycationFooter";

export const metadata = {
    title: "Staycation — Galaxia | Luxury Villas & Resorts",
    description: "Discover premium staycation experiences across exclusive villas and resorts. Private pools, themed rooms, and mountain views await.",
};

export default function StaycationLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-cream-white">
            <StaycationNavbar />
            <main className="pt-[60px]">{children}</main>
            <StaycationFooter />
        </div>
    );
}
