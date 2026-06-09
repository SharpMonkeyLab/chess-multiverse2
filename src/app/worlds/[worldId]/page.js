import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import WorldDetailsClient from "@/components/WorldDetailsClient";

export default async function WorldDetailsPage({ params }) {
    const resolvedParams = await params;
    const worldId = resolvedParams.worldId;

    return (
        <main className="platform-page">
            <SiteHeader />
            <WorldDetailsClient worldId={worldId} />
            <SiteFooter />
        </main>
    );
}