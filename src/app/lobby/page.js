import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";

const MOCK_CHALLENGES = [
  {
    id: "challenge-1",
    world: "Elemental Chess",
    host: "ArcaneGuest",
    status: "Waiting",
    format: "1v1 Duel"
  },
  {
    id: "challenge-2",
    world: "Shinobi Chess",
    host: "SilentPawn",
    status: "Drafting",
    format: "Ability Match"
  },
  {
    id: "challenge-3",
    world: "Material Chess",
    host: "LatticeKing",
    status: "Preview",
    format: "Experimental"
  }
];

const MATCH_STEPS = [
  {
    title: "Choose World",
    text: "Players begin by selecting a custom world from the library."
  },
  {
    title: "Create Challenge",
    text: "A host opens a challenge and waits for another player to join."
  },
  {
    title: "Select Characters",
    text: "Players enter a future character selection screen before the board loads."
  },
  {
    title: "Start Match",
    text: "The game begins using the chosen world's rules, pieces, terrain, and systems."
  }
];

export default function LobbyPage() {
  return (
    <main className="platform-page">
      <SiteHeader />

      <div className="lobby-content">
        <section className="platform-hero lobby-hero">
          <p className="home-kicker">Lobby</p>

          <h1>Find a challenge. Choose a world. Enter the board.</h1>

          <p>
            This will become the multiplayer hub for Chess Multiverse. For now,
            it previews the future flow: public challenges, open tables, world
            selection, and character selection before Play Mode.
          </p>

          <div className="home-action-row">
            <Link className="home-primary-link" href="/worlds">
              Browse Worlds
            </Link>

            <Link className="home-secondary-link" href="/creator">
              Create World
            </Link>
          </div>
        </section>

        <section className="lobby-status-grid">
          <article className="lobby-status-card">
            <span>Live Challenges</span>
            <strong>0</strong>
            <p>Online challenges will appear here once multiplayer exists.</p>
          </article>

          <article className="lobby-status-card">
            <span>Open Tables</span>
            <strong>0</strong>
            <p>Future play sessions waiting for players will be listed here.</p>
          </article>

          <article className="lobby-status-card">
            <span>Local Mode</span>
            <strong>On</strong>
            <p>Current development still uses local worlds and test games.</p>
          </article>
        </section>

        <section className="lobby-section">
          <div className="section-heading-row">
            <div>
              <p className="home-kicker">Preview</p>
              <h2>Challenge Board</h2>
            </div>

            <button type="button" className="lobby-disabled-action" disabled>
              Create Challenge Soon
            </button>
          </div>

          <div className="lobby-challenge-list">
            {MOCK_CHALLENGES.map((challenge) => (
              <article className="lobby-challenge-card" key={challenge.id}>
                <div>
                  <span className="lobby-card-kicker">{challenge.status}</span>
                  <h3>{challenge.world}</h3>
                  <p>
                    Hosted by {challenge.host} · {challenge.format}
                  </p>
                </div>

                <button type="button" disabled>
                  Join Soon
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="lobby-section">
          <div className="section-heading-row">
            <div>
              <p className="home-kicker">Flow</p>
              <h2>How matches will start</h2>
            </div>
          </div>

          <div className="lobby-flow-grid">
            {MATCH_STEPS.map((step, index) => (
              <article className="lobby-flow-card" key={step.title}>
                <span>{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="lobby-coming-soon-card">
          <p className="home-kicker">Coming Soon</p>

          <h2>Real-time multiplayer will arrive later.</h2>

          <p>
            This page is only the visual skeleton for now. Later it will connect
            to accounts, public worlds, lobby challenges, play sessions, and
            eventually real-time multiplayer.
          </p>
        </section>
      </div>
    </main>
  );
}