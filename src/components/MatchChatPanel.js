"use client";

import { useEffect, useRef, useState } from "react";

import {
  fetchSessionMessages,
  sendSessionMessage,
  subscribeToSessionMessages
} from "@/lib/matchChatClient";

function formatChatTime(value) {
  if (!value) return "";

  try {
    return new Intl.DateTimeFormat("en-AU", {
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  } catch {
    return "";
  }
}

export default function MatchChatPanel({
  sessionId = "",
  currentUserId = "",
  disabled = false
}) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendLocked, setSendLocked] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      setStatus("");
      return;
    }

    let cancelled = false;

    async function loadMessages() {
      const { messages: nextMessages, error } = await fetchSessionMessages(
        sessionId
      );

      if (cancelled) return;

      if (error) {
        setStatus(
          error.message?.includes("relation") || error.code === "42P01"
            ? "Chat not set up yet. Run supabase/match_chat_v1.sql."
            : error.message || "Could not load chat."
        );
        setMessages([]);
        return;
      }

      setMessages(nextMessages);
      setStatus("");
    }

    loadMessages();

    const unsubscribe = subscribeToSessionMessages(sessionId, (message) => {
      setMessages((current) => {
        if (current.some((row) => row.id === message.id)) {
          return current;
        }

        return [...current, message];
      });
    });

    const pollId = window.setInterval(loadMessages, 10000);

    return () => {
      cancelled = true;
      unsubscribe();
      window.clearInterval(pollId);
    };
  }, [sessionId]);

  useEffect(() => {
    const list = listRef.current;

    if (!list) return;

    list.scrollTop = list.scrollHeight;
  }, [messages]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!sessionId || disabled || isSending || sendLocked) return;

    setIsSending(true);
    setSendLocked(true);

    const { message, error } = await sendSessionMessage(sessionId, draft);

    if (error) {
      setStatus(error.message || "Could not send.");
      setIsSending(false);
      window.setTimeout(() => setSendLocked(false), 1000);
      return;
    }

    setDraft("");
    setStatus("");
    setMessages((current) => {
      if (current.some((row) => row.id === message.id)) {
        return current;
      }

      return [...current, message];
    });

    setIsSending(false);
    window.setTimeout(() => setSendLocked(false), 1000);
  }

  if (!sessionId) {
    return (
      <section className="panel-box match-chat-box">
        <div className="action-log-header">
          <h2>Match Chat</h2>
        </div>
        <p className="match-chat-empty">
          Match chat appears when you join a live online game.
        </p>
      </section>
    );
  }

  return (
    <section className="panel-box match-chat-box">
      <div className="action-log-header">
        <h2>Match Chat</h2>
      </div>

      <div className="match-chat-list" ref={listRef}>
        {messages.length === 0 ? (
          <p className="match-chat-empty">
            {status || "No messages yet. Wish your opponent good luck."}
          </p>
        ) : (
          messages.map((message) => {
            const isSelf = message.author_id === currentUserId;

            return (
              <article
                className={
                  isSelf ? "match-chat-entry self" : "match-chat-entry"
                }
                key={message.id}
              >
                <div className="match-chat-entry-meta">
                  <strong>{isSelf ? "You" : message.author_name}</strong>
                  <span>{formatChatTime(message.created_at)}</span>
                </div>
                <p>{message.body}</p>
              </article>
            );
          })
        )}
      </div>

      {status && messages.length > 0 && (
        <p className="match-chat-status">{status}</p>
      )}

      <form className="match-chat-compose" onSubmit={handleSubmit}>
        <input
          value={draft}
          maxLength={500}
          placeholder={disabled ? "Chat closed" : "Message opponent..."}
          disabled={disabled || isSending}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button
          type="submit"
          disabled={
            disabled || isSending || sendLocked || !draft.trim()
          }
        >
          Send
        </button>
      </form>
    </section>
  );
}
