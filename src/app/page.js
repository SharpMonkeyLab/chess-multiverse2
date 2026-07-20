import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import HomeFeaturedWorlds from "@/components/HomeFeaturedWorlds";
import HomeHeroActions from "@/components/HomeHeroActions";

export default function Home() {
  return (
    <main className="home-page home-page-scroll">
      <SiteHeader />

      <section className="home-hero-bleed">
        <div className="home-hero-bleed-atmosphere" aria-hidden="true" />
        <div className="home-hero-bleed-grid" aria-hidden="true" />

        <div className="home-hero-bleed-inner">
          <p className="home-brand-signal">Chess Multiverse</p>

          <h1>Every board is a new universe.</h1>

          <p className="home-description">
            Create your own Universe, Ready up for a match, and fight across
            the Multiverse.
          </p>

          <HomeHeroActions />
        </div>
      </section>

      <section className="home-section home-featured-section">
        <div className="home-section-heading">
          <p className="home-kicker">Featured</p>
          <h2>Universes calling for challengers</h2>
        </div>

        <HomeFeaturedWorlds />
      </section>

      <SiteFooter />
    </main>
  );
}
