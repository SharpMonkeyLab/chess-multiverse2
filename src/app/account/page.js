"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import AuthPanel from "@/components/AuthPanel";
import { hasSupabaseConfig, supabase } from "@/lib/supabaseClient";
import { getWorldPreviewImages } from "@/lib/worldData";
import {
  getUserPreferences,
  saveUserPreferences
} from "@/lib/userPreferences";

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

function getDefaultDisplayName(user) {
  const fromMetadata = user?.user_metadata?.display_name?.trim();

  if (fromMetadata) return fromMetadata;
  if (!user?.email) return "New Creator";

  return user.email.split("@")[0];
}

export default function AccountPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);
  const [authStatus, setAuthStatus] = useState("");

  const [displayName, setDisplayName] = useState("");
  const [profileStatus, setProfileStatus] = useState("");
  const [preferCommunityAfterReady, setPreferCommunityAfterReady] =
    useState(false);

  const [onlineWorlds, setOnlineWorlds] = useState([]);
  const [onlineWorldsStatus, setOnlineWorldsStatus] = useState("");
  const [isLoadingOnlineWorlds, setIsLoadingOnlineWorlds] = useState(false);
  const [deletingOnlineWorldId, setDeletingOnlineWorldId] = useState("");
  const [publishingWorldId, setPublishingWorldId] = useState("");

  useEffect(() => {
    if (!hasSupabaseConfig() || !supabase) {
      setHasCheckedAuth(true);
      return;
    }

    async function loadCurrentUser() {
      try {
        const {
          data: { user },
          error
        } = await supabase.auth.getUser();

        if (error) {
          console.warn("Could not load current user:", error.message);
          setCurrentUser(null);
          setDisplayName("");
          setHasCheckedAuth(true);
          return;
        }

        setCurrentUser(user);

        if (user) {
          loadOrCreateProfile(user);
          loadOnlineWorlds(user);
          loadPreferences(user.id);
        }

        setHasCheckedAuth(true);
      } catch (error) {
        console.error("Supabase user fetch failed:", error);

        setCurrentUser(null);
        setDisplayName("");
        setAuthStatus("Could not reach the account service. Check your connection.");
        setHasCheckedAuth(true);
      }
    }

    loadCurrentUser();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user || null;

      setCurrentUser(user);
      setHasCheckedAuth(true);

      if (user) {
        loadOrCreateProfile(user);
        loadOnlineWorlds(user);
        loadPreferences(user.id);
      } else {
        setDisplayName("");
        setOnlineWorlds([]);
        setOnlineWorldsStatus("");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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

      setDisplayName(createdProfile.display_name || "");
      setProfileStatus("");
    } catch (error) {
      console.error("Profile fetch/create failed:", error);
      setProfileStatus("Could not load your profile. Check your connection.");
    }
  }

  function loadPreferences(userId) {
    const prefs = getUserPreferences(userId);
    setPreferCommunityAfterReady(prefs.preferCommunityAfterReady);
  }

  async function handleSaveProfile(event) {
    event.preventDefault();

    if (!supabase || !currentUser) {
      setProfileStatus("You must be signed in to save a profile.");
      return;
    }

    const cleanDisplayName = displayName.trim();

    if (!cleanDisplayName) {
      setProfileStatus("Username cannot be empty.");
      return;
    }

    setProfileStatus("Saving...");

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

      setDisplayName(savedProfile.display_name || "");
      saveUserPreferences(currentUser.id, {
        preferCommunityAfterReady
      });
      setProfileStatus("Settings saved.");
    } catch (error) {
      console.error("Profile save failed:", error);
      setProfileStatus("Could not save your settings. Check your connection.");
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
      setOnlineWorldsStatus("Could not load online universes.");
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
      ? `Publish "${world.name}" so it becomes visible publicly?`
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
      setOnlineWorldsStatus("Could not update this universe.");
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
      `Delete "${world.name}" from your universes? This cannot be undone.`
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

      setOnlineWorldsStatus(`Deleted: ${world.name}`);
    } catch (error) {
      console.error("Online world delete failed:", error);
      setOnlineWorldsStatus("Could not delete this universe.");
    } finally {
      setDeletingOnlineWorldId("");
    }
  }

  async function handleSignOut() {
    if (!supabase) {
      setAuthStatus("Account service is not configured yet.");
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
      setDisplayName("");
      setOnlineWorlds([]);
      setOnlineWorldsStatus("");
      setAuthStatus("Signed out.");
    } catch (error) {
      console.error("Sign out failed:", error);

      setCurrentUser(null);
      setDisplayName("");
      setOnlineWorlds([]);
      setOnlineWorldsStatus("");
      setAuthStatus("Signed out locally.");
    }
  }

  return (
    <main className="platform-page">
      <SiteHeader />

      <div className="account-page-content">
        <section className="platform-hero account-hero">
          <p className="home-kicker">Account</p>

          <h1>
            {currentUser ? "Your profile & universes" : "Sign in to your account"}
          </h1>

          <p>
            {currentUser
              ? "Manage your username and the universes you have created."
              : "Create an account or sign in to manage your universes."}
          </p>

          {currentUser && (
            <div className="home-action-row">
              <Link className="home-primary-link" href="/worlds">
                Browse Universes
              </Link>

              <Link className="home-secondary-link" href="/creator">
                Create Universe
              </Link>
            </div>
          )}
        </section>

        {!hasCheckedAuth ? (
          <section className="account-grid account-grid-single">
            <article className="account-card account-signin-card">
              <p className="account-auth-status">Loading account…</p>
            </article>
          </section>
        ) : currentUser ? (
          <>
            <section className="account-hub-row">
              <article className="account-card account-signin-card">
                <h2>Settings</h2>

                <form
                  className="account-settings-form"
                  onSubmit={handleSaveProfile}
                >
                  <label>
                    <span>Email</span>
                    <input
                      type="email"
                      value={currentUser.email || ""}
                      readOnly
                      tabIndex={-1}
                    />
                  </label>

                  <label>
                    <span>Username</span>
                    <input
                      value={displayName}
                      placeholder="Your public username"
                      onChange={(event) => setDisplayName(event.target.value)}
                    />
                  </label>

                  <fieldset className="account-settings-fieldset">
                    <legend>Preferences</legend>

                    <div className="account-settings-list">
                      <div className="account-settings-row">
                        <div className="account-settings-row-copy">
                          <strong>Prefer Multiverse after Ready</strong>
                          <span>
                            Open Multiverse Community while waiting for a match.
                          </span>
                        </div>

                        <label className="account-settings-toggle">
                          <input
                            type="checkbox"
                            checked={preferCommunityAfterReady}
                            onChange={(event) =>
                              setPreferCommunityAfterReady(event.target.checked)
                            }
                          />
                          <span className="account-settings-toggle-track" aria-hidden="true">
                            <span className="account-settings-toggle-thumb" />
                          </span>
                        </label>
                      </div>
                    </div>
                  </fieldset>

                  <button type="submit" className="account-auth-submit">
                    Save
                  </button>
                </form>

                {profileStatus && (
                  <p className="account-auth-status">{profileStatus}</p>
                )}

                <button
                  type="button"
                  className="account-sign-out-link"
                  onClick={handleSignOut}
                >
                  Sign Out
                </button>

                {authStatus && (
                  <p className="account-auth-status">{authStatus}</p>
                )}
              </article>

              <section className="account-card account-online-worlds-card">
              <div className="account-section-heading-row">
                <h2>My Universes</h2>

                <Link className="home-secondary-link" href="/creator">
                  Create New Universe
                </Link>
              </div>

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
                    <p>Your universes will appear here.</p>
                  </div>
                )}

              {onlineWorlds.length > 0 && (
                <div className="account-online-world-grid">
                  {onlineWorlds.map((world) => {
                    const previewImages = getWorldPreviewImages({
                      data: world.world_data
                    });

                    return (
                      <article
                        className="account-online-world-card"
                        key={world.id}
                      >
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
                            <span>
                              {world.is_public ? "Public" : "Private Draft"}
                            </span>
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
                              Edit Universe
                            </Link>

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

                            <button
                              type="button"
                              className="world-delete-link"
                              onClick={() => handleDeleteOnlineWorld(world)}
                              disabled={deletingOnlineWorldId === world.id}
                            >
                              {deletingOnlineWorldId === world.id
                                ? "Deleting..."
                                : "Delete Universe"}
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
              </section>
            </section>
          </>
        ) : (
          <section className="account-grid account-grid-single">
            <article className="account-card account-signin-card">
              <h2>Sign in or create account</h2>
              <AuthPanel
                initialMode="sign-in"
                showTitle={false}
                onSignInSuccess={() => setAuthStatus("")}
                onSignUpSuccess={() => setAuthStatus("")}
              />
            </article>
          </section>
        )}
      </div>

      <SiteFooter />
    </main>
  );
}
