import CelebrationNavbar from "../components/CelebrationNavbar";
import CelebrationFooter from "../components/CelebrationFooter";
import "./celebration.css";

export const metadata = {
    title: "Digital Diaries — Galaxia | Private Movie Screenings",
    description: "Premium private movie screenings with themed rooms. Celebrate birthdays, anniversaries, and special moments in style at Digital Diaries by Galaxia.",
};

export default function CelebrationLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <style>{`
                body { background: #0D0D0D !important; background-color: #0D0D0D !important; }
                ::-webkit-scrollbar { width: 10px; height: 10px; }
                ::-webkit-scrollbar-track { background: #0D0D0D; border-left: 1px solid #2A2A2A; }
                ::-webkit-scrollbar-thumb { background: #9f353a; border-radius: 5px; border: 2px solid #0D0D0D; }
                ::-webkit-scrollbar-thumb:hover { background: #d87f82; }
                * { scrollbar-width: thin; scrollbar-color: #9f353a #0D0D0D; }
            `}</style>
            <div className="min-h-screen text-cel-text" style={{ background: "#0D0D0D" }}>
                <CelebrationNavbar />
                <main className="pt-[56px]">{children}</main>
                <CelebrationFooter />
            </div>
        </>
    );
}

