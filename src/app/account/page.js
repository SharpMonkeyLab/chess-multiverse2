"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { hasSupabaseConfig, supabase } from "@/lib/supabaseClient";
import { getWorldPreviewImages } from "@/lib/worldData";

const COMING_SOON_ACCOUNT_FEATURES = [
  {
    title: "Match History",
    text: "Review past play sessions, results, and universes you have played."
  },
  {
    title: "Favourites & Ratings",
    text: "Save universes you like and rate public universes for the community."
  },
  {
    title: "Public Challenge Tables",
    text: "Host or join open lobby tables without leaving the lobby page."
  }
];

function formatAccountDate(value) {
  if (!value) return "Unknown date";

  try {
    return new Intl.DateTimeFormat("en-AU", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }).format(new Date(value));
  } catch {
    return "Unknown date";
  }
}

export default function AccountPage() {
  const [authMode, setAuthMode] = useState("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [currentUser, setCurrentUser] = useState(null);
  const [authStatus, setAuthStatus] = useState("");

  const [profile, setProfile] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [profileStatus, setProfileStatus] = useState("");

  const [onlineWorlds, setOnlineWorlds] = useState([]);
  const [onlineWorldsStatus, setOnlineWorldsStatus] = useState("");
  const [isLoadingOnlineWorlds, setIsLoadingOnlineWorlds] = useState(false);
  const [deletingOnlineWorldId, setDeletingOnlineWorldId] = useState("");
  const [publishingWorldId, setPublishingWorldId] = useState("");

  const isSupabaseReady = hasSupabaseConfig();

  useEffect(() => {
    if (!supabase) return;

    async function loadCurrentUser() {
      try {
        const {
          data: { user },
          error
        } = await supabase.auth.getUser();

        if (error) {
          console.warn("Could not load current user:", error.message);
          setCurrentUser(null);
          setProfile(null);
          setDisplayName("");
          return;
        }

        setCurrentUser(user);

        if (user) {
          loadOrCreateProfile(user);
          loadOnlineWorlds(user);
        }
      } catch (error) {
        console.error("Supabase user fetch failed:", error);

        setCurrentUser(null);
        setProfile(null);
        setDisplayName("");
        setAuthStatus(
          "Could not reach Supabase. Check your internet connection or Supabase project settings."
        );
      }
    }

    loadCurrentUser();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user || null;

      setCurrentUser(user);

      if (user) {
        loadOrCreateProfile(user);
        loadOnlineWorlds(user);
      } else {
        setProfile(null);
        setDisplayName("");
        setOnlineWorlds([]);
        setOnlineWorldsStatus("");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleSignUp(event) {
    event.preventDefault();

    if (!supabase) {
      setAuthStatus("Supabase is not configured yet.");
      return;
    }

    setAuthStatus("Creating account...");

    const { error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) {
      setAuthStatus(error.message);
      return;
    }

    setAuthStatus(
      "Account created. Check your email if Supabase asks for confirmation."
    );
  }

  async function handleSignIn(event) {
    event.preventDefault();

    if (!supabase) {
      setAuthStatus("Supabase is not configured yet.");
      return;
    }

    setAuthStatus("Signing in...");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setAuthStatus(error.message);
      return;
    }

    setAuthStatus("Signed in successfully.");
    setPassword("");
  }

  function getDefaultDisplayName(user) {
    if (!user?.email) return "New Creator";

    return user.email.split("@")[0];
  }

  async function loadOrCreateProfile(user) {
    if (!supabase || !user) return;

    setProfileStatus("Loading profile...");

    try {
      const { data: existingProfile, error: loadError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (existingProfile) {
        setProfile(existingProfile);
        setDisplayName(existingProfile.display_name || "");
        setProfileStatus("");
        return;
      }

      const defaultDisplayName = getDefaultDisplayName(user);

      const { data: createdProfile, error: createError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            display_name: defaultDisplayName,
            updated_at: new Date().toISOString()
          },
          {
            onConflict: "id"
          }
        )
        .select("*")
        .single();

      if (createError) {
        setProfileStatus(createError.message || loadError?.message);
        return;
      }

      setProfile(createdProfile);
      setDisplayName(createdProfile.display_name || "");
      setProfileStatus("Profile created.");
    } catch (error) {
      console.error("Profile fetch/create failed:", error);

      setProfileStatus(
        "Could not reach Supabase to load your profile."
      );
    }
  }

  async function handleSaveProfile(event) {
    event.preventDefault();

    if (!supabase || !currentUser) {
      setProfileStatus("You must be signed in to save a profile.");
      return;
    }

    const cleanDisplayName = displayName.trim();

    if (!cleanDisplayName) {
      setProfileStatus("Display name cannot be empty.");
      return;
    }

    setProfileStatus("Saving profile...");

    try {
      const { data: savedProfile, error } = await supabase
        .from("profiles")
        .upsert(
          {
            id: currentUser.id,
            display_name: cleanDisplayName,
            updated_at: new Date().toISOString()
          },
          {
            onConflict: "id"
          }
        )
        .select("*")
        .single();

      if (error) {
        setProfileStatus(error.message);
        return;
      }

      setProfile(savedProfile);
      setDisplayName(savedProfile.display_name || "");
      setProfileStatus("Profile saved.");
    } catch (error) {
      console.error("Profile save failed:", error);

      setProfileStatus(
        "Could not reach Supabase to save your profile."
      );
    }
  }

  async function loadOnlineWorlds(user) {
    if (!supabase || !user) {
      setOnlineWorlds([]);
      return;
    }

    setIsLoadingOnlineWorlds(true);
    setOnlineWorldsStatus("Loading online universes…");

    try {
      const { data, error } = await supabase
        .from("worlds")
        .select(
          "id, name, description, is_public, complexity_label, rating_average, total_match_count, updated_at, world_data"
        )
        .eq("owner_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) {
        setOnlineWorldsStatus(error.message);
        setOnlineWorlds([]);
        return;
      }

      setOnlineWorlds(data || []);
      setOnlineWorldsStatus("");
    } catch (error) {
      console.error("Online worlds fetch failed:", error);

      setOnlineWorlds([]);
      setOnlineWorldsStatus("Could not reach Supabase to load online universes.");
    } finally {
      setIsLoadingOnlineWorlds(false);
    }
  }

  async function handleTogglePublishWorld(world) {
    if (!supabase || !currentUser) {
      setOnlineWorldsStatus("You must be signed in to publish universes.");
      return;
    }

    const nextIsPublic = !world.is_public;

    const confirmMessage = nextIsPublic
      ? `Publish "${world.name}" so it can become visible publicly later?`
      : `Unpublish "${world.name}" and return it to Private Draft?`;

    const confirmed = window.confirm(confirmMessage);

    if (!confirmed) return;

    setPublishingWorldId(world.id);
    setOnlineWorldsStatus(
      nextIsPublic ? "Publishing universe..." : "Unpublishing universe..."
    );

    try {
      const { data: updatedWorld, error } = await supabase
        .from("worlds")
        .update({
          is_public: nextIsPublic,
          updated_at: new Date().toISOString()
        })
        .eq("id", world.id)
        .eq("owner_id", currentUser.id)
        .select(
          "id, name, description, is_public, complexity_label, rating_average, total_match_count, updated_at, world_data"
        )
        .single();

      if (error) {
        setOnlineWorldsStatus(error.message);
        return;
      }

      setOnlineWorlds((currentWorlds) =>
        currentWorlds.map((currentWorld) =>
          currentWorld.id === updatedWorld.id ? updatedWorld : currentWorld
        )
      );

      setOnlineWorldsStatus(
        updatedWorld.is_public
          ? `"${updatedWorld.name}" is now public.`
          : `"${updatedWorld.name}" is now a private draft.`
      );
    } catch (error) {
      console.error("Publish toggle failed:", error);
      setOnlineWorldsStatus("Could not reach Supabase to update this universe.");
    } finally {
      setPublishingWorldId("");
    }
  }

  async function handleDeleteOnlineWorld(world) {
    if (!supabase || !currentUser) {
      setOnlineWorldsStatus("You must be signed in to delete online universes.");
      return;
    }

    const confirmed = window.confirm(
      `Delete "${world.name}" from your online drafts? This cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingOnlineWorldId(world.id);
    setOnlineWorldsStatus(`Deleting ${world.name}...`);

    try {
      const { error } = await supabase
        .from("worlds")
        .delete()
        .eq("id", world.id)
        .eq("owner_id", currentUser.id);

      if (error) {
        setOnlineWorldsStatus(error.message);
        return;
      }

      setOnlineWorlds((currentWorlds) =>
        currentWorlds.filter((currentWorld) => currentWorld.id !== world.id)
      );

      setOnlineWorldsStatus(`Deleted online draft: ${world.name}`);
    } catch (error) {
      console.error("Online world delete failed:", error);
      setOnlineWorldsStatus("Could not reach Supabase to delete this universe.");
    } finally {
      setDeletingOnlineWorldId("");
    }
  }

  async function handleSignOut() {
    if (!supabase) {
      setAuthStatus("Supabase is not configured yet.");
      return;
    }

    setAuthStatus("Signing out...");

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        setAuthStatus(error.message);
        return;
      }

      setCurrentUser(null);
      setProfile(null);
      setDisplayName("");

      setOnlineWorlds([]);
      setOnlineWorldsStatus("");

      setAuthStatus("Signed out.");
      setPassword("");
    } catch (error) {
      console.error("Sign out failed:", error);

      setCurrentUser(null);
      setProfile(null);
      setDisplayName("");

      setOnlineWorlds([]);
      setOnlineWorldsStatus("");

      setPassword("");
      setAuthStatus(
        "Signed out locally. Supabase could not be reached to fully confirm sign out."
      );
    }
  }

  return (
    <main className="platform-page">
      <SiteHeader />

      <div className="account-page-content">
        <section className="platform-hero account-hero">
          <p className="home-kicker">Account</p>

          <h1>Your universes will live here.</h1>

          <p>
            Accounts are connected to Supabase Auth. Save universes online, publish
            them for the community, and open them again in the Creator from this
            page.
          </p>

          <div className="home-action-row">
            <Link className="home-primary-link" href="/worlds">
              Browse Universes
            </Link>

            <Link className="home-secondary-link" href="/creator">
              Create Universe
            </Link>
          </div>
        </section>

        <section className="account-grid">
          <article className="account-card account-signin-card">
            <p className="home-kicker">Supabase Auth</p>

            <h2>{currentUser ? "Signed in" : "Sign in or create account"}</h2>

            <div
              className={
                isSupabaseReady
                  ? "account-supabase-status connected"
                  : "account-supabase-status missing"
              }
            >
              <strong>Supabase status:</strong>
              <span>
                {isSupabaseReady
                  ? "Environment variables found."
                  : "Environment variables missing."}
              </span>
            </div>

            {currentUser ? (
              <div className="account-current-user-card">
                <p className="home-kicker">Current User</p>

                <h3>{currentUser.email}</h3>

                <p>
                  You are signed in. Your email is used for login, but your display
                  name is what should appear publicly as your creator identity.
                </p>

                <form className="account-profile-form" onSubmit={handleSaveProfile}>
                  <label>Display Name</label>

                  <input
                    value={displayName}
                    placeholder="Creator display name"
                    onChange={(event) => setDisplayName(event.target.value)}
                  />

                  <button type="submit">Save Profile</button>
                </form>

                {profileStatus && (
                  <p className="account-auth-status">{profileStatus}</p>
                )}

                <button type="button" onClick={handleSignOut}>
                  Sign Out
                </button>
              </div>
            ) : (
              <form
                className="account-auth-form"
                onSubmit={
                  authMode === "sign-in" ? handleSignIn : handleSignUp
                }
              >
                <div className="account-auth-tabs">
                  <button
                    type="button"
                    className={authMode === "sign-in" ? "active" : ""}
                    onClick={() => {
                      setAuthMode("sign-in");
                      setAuthStatus("");
                    }}
                  >
                    Sign In
                  </button>

                  <button
                    type="button"
                    className={authMode === "sign-up" ? "active" : ""}
                    onClick={() => {
                      setAuthMode("sign-up");
                      setAuthStatus("");
                    }}
                  >
                    Sign Up
                  </button>
                </div>

                <label>Email</label>
                <input
                  value={email}
                  type="email"
                  placeholder="you@example.com"
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />

                <label>Password</label>
                <input
                  value={password}
                  type="password"
                  placeholder="At least 6 characters"
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />

                <button
                  type="submit"
                  className="account-auth-submit"
                  disabled={!isSupabaseReady}
                >
                  {authMode === "sign-in" ? "Sign In" : "Create Account"}
                </button>
              </form>
            )}

            {authStatus && (
              <p className="account-auth-status">{authStatus}</p>
            )}
          </article>

          <article className="account-card">
            <p className="home-kicker">Storage</p>

            <h2>Account universes + JSON backups</h2>

            <p>
              Universes saved from the Creator now live in your account. Exporting
              JSON is still useful as a personal backup or for transferring a universe
              manually.
            </p>

            <div className="account-storage-note">
              <strong>Current mode:</strong>
              <span>Online universes with optional JSON backup</span>
            </div>
          </article>
        </section>

        {currentUser && (
          <section className="account-card account-online-worlds-card">
            <div className="account-section-heading-row">
              <div>
                <p className="home-kicker">Creator Library</p>
                <h2>My Universes</h2>
              </div>

              <Link className="home-secondary-link" href="/creator">
                Create New Universe
              </Link>
            </div>

            <p>
              These are universes saved to your account. They are private drafts for now.
              You can open them in the Creator, keep editing them, and later publish
              selected universes for the community.
            </p>

            {isLoadingOnlineWorlds && (
              <p className="account-auth-status">Loading online universes…</p>
            )}

            {onlineWorldsStatus && (
              <p className="account-auth-status">{onlineWorldsStatus}</p>
            )}

            {!isLoadingOnlineWorlds &&
              !onlineWorldsStatus &&
              onlineWorlds.length === 0 && (
                <div className="account-online-world-empty">
                  <h3>No online universes yet</h3>
                  <p>
                    Open the Creator, sign in, and click Save Universe. Then your worlds
                    will appear here.
                  </p>
                </div>
              )}

            {onlineWorlds.length > 0 && (
              <div className="account-online-world-grid">
                {onlineWorlds.map((world) => {
                  const previewImages = getWorldPreviewImages({
                    data: world.world_data
                  });

                  return (
                    <article className="account-online-world-card" key={world.id}>
                      <div className="account-online-world-preview">
                        {previewImages.backgroundImage && (
                          <img
                            className="account-online-world-background"
                            src={previewImages.backgroundImage}
                            alt=""
                            aria-hidden="true"
                          />
                        )}

                        <div className="account-online-world-overlay" />

                        {previewImages.boardSkinImage ? (
                          <img
                            className="account-online-world-board"
                            src={previewImages.boardSkinImage}
                            alt={`${world.name} board preview`}
                          />
                        ) : (
                          <span>{world.name.slice(0, 1)}</span>
                        )}
                      </div>

                      <div className="account-online-world-body">
                        <div className="account-online-world-topline">
                          <span>{world.is_public ? "Public" : "Private Draft"}</span>
                          <span>{formatAccountDate(world.updated_at)}</span>
                        </div>

                        <h3>{world.name}</h3>

                        <p>
                          {world.description ||
                            "No description yet. This universe is online, mysterious, and possibly plotting."}
                        </p>

                        <div className="account-online-world-meta-row">
                          <span>{world.complexity_label || "Basic"}</span>
                          <span>{world.total_match_count || 0} matches</span>
                          <span>★ {world.rating_average || 0}</span>
                        </div>

                        <div className="account-online-world-action-row">
                          <Link
                            className="world-play-link"
                            href={`/creator?onlineWorld=${world.id}`}
                          >
                            Open in Creator
                          </Link>

                          <button
                            type="button"
                            className="world-delete-link"
                            onClick={() => handleDeleteOnlineWorld(world)}
                            disabled={deletingOnlineWorldId === world.id}
                          >
                            {deletingOnlineWorldId === world.id ? "Deleting..." : "Delete Online"}
                          </button>

                          <button
                            type="button"
                            className={
                              publishingWorldId === world.id
                                ? "world-soon-link loading"
                                : "world-soon-link"
                            }
                            disabled={publishingWorldId === world.id}
                            onClick={() => handleTogglePublishWorld(world)}
                            title={
                              world.is_public
                                ? "Return this universe to Private Draft."
                                : "Mark this universe as public."
                            }
                          >
                            {publishingWorldId === world.id
                              ? "Updating..."
                              : world.is_public
                                ? "Unpublish"
                                : "Publish"}
                          </button>
                        </div>

                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        <section className="account-card">
          <p className="home-kicker">Coming Soon</p>

          <h2>Still on the account roadmap</h2>

          <div className="account-feature-grid">
            {COMING_SOON_ACCOUNT_FEATURES.map((feature) => (
              <article className="account-feature-card" key={feature.title}>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </article>
            ))}
          </div>
        </section>
      </div>

      <SiteFooter />
    </main>
  );
}