"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import {
  fetchRecentLobbyMessages,
  sendLobbyMessage,
  subscribeToLobbyMessages
} from "@/lib/lobbyChatClient";
import { fetchOnlinePlayerCount } from "@/lib/presenceClient";
import { hasSupabaseConfig, supabase } from "@/lib/supabaseClient";
import { getWorldComplexity, getWorldPreviewImages } from "@/lib/worldData";
import { fetchRecentWorldPosts } from "@/lib/worldPostsClient";
import MatchmakingReadyButton from "@/components/MatchmakingReadyButton";

function formatShortTime(value) {
  if (!value) return "";

  try {
    return new Intl.DateTimeFormat("en-AU", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  } catch {
    return "";
  }
}

export default function LobbyClient() {
  const [currentUser, setCurrentUser] = useState(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [worlds, setWorlds] = useState([]);
  const [worldsStatus, setWorldsStatus] = useState("");
  const [isLoadingWorlds, setIsLoadingWorlds] = useState(false);

  const [messages, setMessages] = useState([]);
  const [chatDraft, setChatDraft] = useState("");
  const [chatStatus, setChatStatus] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [sendLocked, setSendLocked] = useState(false);

  const [recentPosts, setRecentPosts] = useState([]);
  const [postsStatus, setPostsStatus] = useState("");
  const [readyStatus, setReadyStatus] = useState("");

  const chatListRef = useRef(null);

  async function loadCurrentUser() {
    if (!hasSupabaseConfig() || !supabase) {
      setCurrentUser(null);
      return;
    }

    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      setCurrentUser(user || null);
    } catch {
      setCurrentUser(null);
    }
  }

  async function loadOnlineCount() {
    const count = await fetchOnlinePlayerCount();
    setOnlineCount(count);
  }

  async function loadWorlds() {
    if (!hasSupabaseConfig() || !supabase) {
      setWorlds([]);
      setWorldsStatus("Supabase is not configured.");
      return;
    }

    setIsLoadingWorlds(true);
    setWorldsStatus("Loading universes…");

    try {
      const { data, error } = await supabase
        .from("worlds")
        .select(
          "id, owner_id, name, description, is_public, complexity_label, updated_at, world_data"
        )
        .eq("is_public", true)
        .order("updated_at", { ascending: false })
        .limit(24);

      if (error) {
        setWorlds([]);
        setWorldsStatus(error.message);
        return;
      }

      setWorlds(data || []);
      setWorldsStatus("");
    } catch {
      setWorlds([]);
      setWorldsStatus("Could not load universes.");
    } finally {
      setIsLoadingWorlds(false);
    }
  }

  async function loadChat() {
    const { messages: nextMessages, error } = await fetchRecentLobbyMessages(80);

    if (error) {
      setChatStatus(
        error.message?.includes("relation") || error.code === "42P01"
          ? "Chat tables are not set up yet. Run supabase/social_v1.sql."
          : error.message || "Could not load chat."
      );
      setMessages([]);
      return;
    }

    setMessages(nextMessages);
    setChatStatus("");
  }

  async function loadRecentPosts() {
    const { posts, error } = await fetchRecentWorldPosts(8);

    if (error) {
      setPostsStatus(
        error.message?.includes("relation") || error.code === "42P01"
          ? "Posts are not set up yet. Run supabase/social_v1.sql."
          : ""
      );
      setRecentPosts([]);
      return;
    }

    setRecentPosts(posts);
    setPostsStatus("");
  }

  useEffect(() => {
    loadCurrentUser();
    loadOnlineCount();
    loadWorlds();
    loadChat();
    loadRecentPosts();

    if (!supabase) return;

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user || null);
    });

    const unsubscribeChat = subscribeToLobbyMessages((message) => {
      setMessages((current) => {
        if (current.some((row) => row.id === message.id)) {
          return current;
        }

        return [...current, message];
      });
    });

    const onlineInterval = window.setInterval(loadOnlineCount, 30000);
    const chatPoll = window.setInterval(loadChat, 12000);

    return () => {
      subscription.unsubscribe();
      unsubscribeChat();
      window.clearInterval(onlineInterval);
      window.clearInterval(chatPoll);
    };
  }, []);

  useEffect(() => {
    const list = chatListRef.current;

    if (!list) return;

    list.scrollTop = list.scrollHeight;
  }, [messages]);

  async function handleSendChat(event) {
    event.preventDefault();

    if (!currentUser) {
      setChatStatus("Sign in to chat in the lobby.");
      return;
    }

    if (isSendingChat || sendLocked) return;

    setIsSendingChat(true);
    setSendLocked(true);

    const { message, error } = await sendLobbyMessage(chatDraft);

    if (error) {
      setChatStatus(error.message || "Could not send message.");
      setIsSendingChat(false);
      window.setTimeout(() => setSendLocked(false), 1000);
      return;
    }

    setChatDraft("");
    setChatStatus("");
    setMessages((current) => {
      if (current.some((row) => row.id === message.id)) {
        return current;
      }

      return [...current, message];
    });

    setIsSendingChat(false);
    window.setTimeout(() => setSendLocked(false), 1000);
  }

  return (
    <div className="lobby-content lobby-live-content">
      <section className="lobby-header-strip">
        <div>
          <p className="home-kicker">Lobby</p>
          <h1>Ready up. Chat. Find a fight.</h1>
          <p>
            Match across every published universe, talk with players online, and
            catch the latest creator updates.
          </p>
        </div>

        <div className="lobby-header-meta">
          <span className="lobby-online-pill">
            {onlineCount} online
          </span>
          <Link className="home-secondary-link" href="/worlds">
            Browse Universes
          </Link>
        </div>
      </section>

      {!currentUser && (
        <p className="lobby-auth-nudge">
          <Link href="/account">Sign in</Link> to Ready up and use lobby chat.
        </p>
      )}

      {readyStatus && (
        <p className="lobby-ready-status" aria-live="polite">
          {readyStatus}
        </p>
      )}

      <div className="lobby-main-grid">
        <section className="lobby-panel lobby-ready-panel">
          <div className="lobby-panel-heading">
            <div>
              <p className="home-kicker">Matchmaking</p>
              <h2>Ready across universes</h2>
            </div>
            <button
              type="button"
              className="world-library-disabled-pill"
              onClick={loadWorlds}
              disabled={isLoadingWorlds}
            >
              {isLoadingWorlds ? "Loading..." : "Refresh"}
            </button>
          </div>

          {worldsStatus && <p className="lobby-inline-status">{worldsStatus}</p>}

          {!worldsStatus && worlds.length === 0 && !isLoadingWorlds && (
            <p className="lobby-inline-status">
              No published universes yet. Publish one from Account to Ready up here.
            </p>
          )}

          <div className="lobby-world-ready-list">
            {worlds.map((world) => {
              const worldForHelpers = {
                name: world.name,
                data: world.world_data,
                complexity_label: world.complexity_label
              };
              const previewImages = getWorldPreviewImages(worldForHelpers);
              const complexity = getWorldComplexity(worldForHelpers);

              return (
                <article className="lobby-world-ready-row" key={world.id}>
                  <div className="lobby-world-ready-preview">
                    {previewImages.boardSkinImage ? (
                      <img
                        src={previewImages.boardSkinImage}
                        alt=""
                        aria-hidden="true"
                      />
                    ) : (
                      <span>{world.name.slice(0, 1)}</span>
                    )}
                  </div>

                  <div className="lobby-world-ready-copy">
                    <Link href={`/worlds/${world.id}`}>
                      <strong>{world.name}</strong>
                    </Link>
                    <span>{complexity}</span>
                  </div>

                  <MatchmakingReadyButton
                    className="lobby-ready-button"
                    worldId={world.id}
                    worldName={world.name}
                    disabled={!currentUser}
                    disabledLabel="Sign in"
                    readyLabel="Ready"
                    loadingLabel="Finding..."
                    onStatusChange={setReadyStatus}
                  />
                </article>
              );
            })}
          </div>
        </section>

        <section className="lobby-panel lobby-chat-panel">
          <div className="lobby-panel-heading">
            <div>
              <p className="home-kicker">Global Chat</p>
              <h2>Lobby talk</h2>
            </div>
          </div>

          <div className="lobby-chat-list" ref={chatListRef}>
            {messages.length === 0 ? (
              <p className="lobby-inline-status">
                {chatStatus || "No messages yet. Be the first to say hello."}
              </p>
            ) : (
              messages.map((message) => (
                <div className="lobby-chat-message" key={message.id}>
                  <div className="lobby-chat-message-meta">
                    <strong>{message.author_name}</strong>
                    <span>{formatShortTime(message.created_at)}</span>
                  </div>
                  <p>{message.body}</p>
                </div>
              ))
            )}
          </div>

          {chatStatus && messages.length > 0 && (
            <p className="lobby-inline-status">{chatStatus}</p>
          )}

          <form className="lobby-chat-compose" onSubmit={handleSendChat}>
            <input
              value={chatDraft}
              maxLength={500}
              placeholder={
                currentUser ? "Message the lobby..." : "Sign in to chat"
              }
              disabled={!currentUser || isSendingChat}
              onChange={(event) => setChatDraft(event.target.value)}
            />
            <button
              type="submit"
              disabled={
                !currentUser || isSendingChat || sendLocked || !chatDraft.trim()
              }
            >
              Send
            </button>
          </form>
        </section>
      </div>

      <section className="lobby-panel lobby-posts-panel">
        <div className="lobby-panel-heading">
          <div>
            <p className="home-kicker">Updates</p>
            <h2>Recent universe posts</h2>
          </div>
        </div>

        {postsStatus && <p className="lobby-inline-status">{postsStatus}</p>}

        {!postsStatus && recentPosts.length === 0 && (
          <p className="lobby-inline-status">
            No universe updates yet. Creator posts from universe pages will appear here.
          </p>
        )}

        <div className="lobby-recent-posts">
          {recentPosts.map((post) => (
            <article className="lobby-recent-post" key={post.id}>
              <div className="lobby-recent-post-meta">
                <Link href={`/worlds/${post.world_id}?tab=posts`}>
                  {post.world_name}
                </Link>
                <span>
                  {post.author_name} · {formatShortTime(post.created_at)}
                </span>
              </div>
              <p>
                {post.body.length > 160
                  ? `${post.body.slice(0, 160)}…`
                  : post.body}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
