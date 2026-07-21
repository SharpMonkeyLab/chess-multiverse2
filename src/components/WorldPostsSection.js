"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  createWorldPost,
  createWorldPostReply,
  deleteWorldPost,
  deleteWorldPostReply,
  fetchLatestWorldPost,
  fetchWorldPostsWithReplies
} from "@/lib/worldPostsClient";

function formatPostTime(value) {
  if (!value) return "";

  try {
    return new Intl.DateTimeFormat("en-AU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  } catch {
    return "";
  }
}

export default function WorldPostsSection({
  worldId,
  ownerId,
  currentUser,
  worldSource,
  openPostsInitially = false
}) {
  const [latestPost, setLatestPost] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isPostsOpen, setIsPostsOpen] = useState(openPostsInitially);
  const [status, setStatus] = useState("");
  const [postDraft, setPostDraft] = useState("");
  const [replyDrafts, setReplyDrafts] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");

  const canComposePost =
    worldSource === "online" &&
    currentUser?.id &&
    ownerId &&
    currentUser.id === ownerId;

  async function loadLatest() {
    if (worldSource !== "online" || !worldId) {
      setLatestPost(null);
      return;
    }

    const { post } = await fetchLatestWorldPost(worldId);
    setLatestPost(post);
  }

  async function loadAllPosts() {
    if (worldSource !== "online" || !worldId) {
      setPosts([]);
      return;
    }

    const { posts: nextPosts, error } = await fetchWorldPostsWithReplies(worldId);

    if (error) {
      setStatus(error.message || "Could not load posts.");
      setPosts([]);
      return;
    }

    setPosts(nextPosts);
    setStatus("");

    if (nextPosts[0]) {
      setLatestPost(nextPosts[0]);
    } else {
      setLatestPost(null);
    }
  }

  useEffect(() => {
    loadLatest();
  }, [worldId, worldSource]);

  useEffect(() => {
    if (openPostsInitially) {
      setIsPostsOpen(true);
      loadAllPosts();
    }
  }, [openPostsInitially, worldId, worldSource]);

  async function handleOpenPosts() {
    setIsPostsOpen(true);
    await loadAllPosts();
  }

  async function handleCreatePost(event) {
    event.preventDefault();

    if (!canComposePost || isSaving) return;

    setIsSaving(true);
    const { post, error } = await createWorldPost(worldId, postDraft);

    if (error) {
      setStatus(error.message || "Could not create post.");
      setIsSaving(false);
      return;
    }

    setPostDraft("");
    setPosts((current) => [post, ...current]);
    setLatestPost(post);
    setStatus("");
    setIsSaving(false);
  }

  async function handleCreateReply(event, postId) {
    event.preventDefault();

    if (!currentUser || isSaving) return;

    const draft = replyDrafts[postId] || "";

    setIsSaving(true);
    const { reply, error } = await createWorldPostReply(postId, draft);

    if (error) {
      setStatus(error.message || "Could not reply.");
      setIsSaving(false);
      return;
    }

    setReplyDrafts((current) => ({ ...current, [postId]: "" }));
    setPosts((current) =>
      current.map((post) =>
        post.id === postId
          ? { ...post, replies: [...(post.replies || []), reply] }
          : post
      )
    );
    setStatus("");
    setIsSaving(false);
  }

  async function handleDeletePost(post) {
    if (!currentUser?.id || post.author_id !== currentUser.id || deletingId) {
      return;
    }

    const confirmed = window.confirm("Delete this post and its replies?");
    if (!confirmed) return;

    setDeletingId(post.id);
    const { error } = await deleteWorldPost(post.id);

    if (error) {
      setStatus(error.message || "Could not delete post.");
      setDeletingId("");
      return;
    }

    const nextPosts = posts.filter((item) => item.id !== post.id);
    setPosts(nextPosts);
    setLatestPost(nextPosts[0] || null);
    setStatus("Post deleted.");
    setDeletingId("");
  }

  async function handleDeleteReply(postId, reply) {
    if (!currentUser?.id || reply.author_id !== currentUser.id || deletingId) {
      return;
    }

    const confirmed = window.confirm("Delete this reply?");
    if (!confirmed) return;

    setDeletingId(reply.id);
    const { error } = await deleteWorldPostReply(reply.id);

    if (error) {
      setStatus(error.message || "Could not delete reply.");
      setDeletingId("");
      return;
    }

    setPosts((current) =>
      current.map((post) =>
        post.id === postId
          ? {
              ...post,
              replies: (post.replies || []).filter((item) => item.id !== reply.id)
            }
          : post
      )
    );
    setStatus("Reply deleted.");
    setDeletingId("");
  }

  if (worldSource !== "online") {
    return null;
  }

  return (
    <section className="world-posts-section">
      <div className="world-posts-latest-card">
        <div className="world-posts-latest-copy">
          <p className="home-kicker">Latest update</p>

          {latestPost ? (
            <>
              <p className="world-posts-latest-body">
                {latestPost.body.length > 220
                  ? `${latestPost.body.slice(0, 220)}…`
                  : latestPost.body}
              </p>
              <span className="world-posts-latest-meta">
                {latestPost.author_name} · {formatPostTime(latestPost.created_at)}
              </span>
            </>
          ) : (
            <p className="world-posts-latest-body muted">
              No creator updates yet.
            </p>
          )}
        </div>

        <button
          type="button"
          className="home-secondary-link world-posts-open-button"
          onClick={handleOpenPosts}
        >
          Posts
        </button>
      </div>

      {isPostsOpen && (
        <div className="world-posts-panel">
          <div className="world-posts-panel-heading">
            <h2>Universe posts</h2>
            <button
              type="button"
              className="world-library-disabled-pill"
              onClick={() => setIsPostsOpen(false)}
            >
              Close
            </button>
          </div>

          {status && <p className="lobby-inline-status">{status}</p>}

          {canComposePost ? (
            <form className="world-posts-compose" onSubmit={handleCreatePost}>
              <textarea
                value={postDraft}
                maxLength={2000}
                placeholder="Post an update for players of this universe…"
                onChange={(event) => setPostDraft(event.target.value)}
              />
              <button type="submit" disabled={isSaving || !postDraft.trim()}>
                Post update
              </button>
            </form>
          ) : (
            <p className="lobby-inline-status">
              Only the creator can post updates.
              {!currentUser && (
                <>
                  {" "}
                  <Link href="/account">Sign in</Link> to reply.
                </>
              )}
            </p>
          )}

          <div className="world-posts-thread-list">
            {posts.length === 0 ? (
              <p className="lobby-inline-status">No posts yet.</p>
            ) : (
              posts.map((post) => (
                <article className="world-post-thread" key={post.id}>
                  <div className="world-post-thread-meta">
                    <strong>{post.author_name}</strong>
                    <span>{formatPostTime(post.created_at)}</span>
                    {currentUser?.id === post.author_id ? (
                      <button
                        type="button"
                        className="world-post-delete-button"
                        disabled={Boolean(deletingId)}
                        onClick={() => handleDeletePost(post)}
                      >
                        {deletingId === post.id ? "Deleting…" : "Delete"}
                      </button>
                    ) : null}
                  </div>
                  <p>{post.body}</p>

                  <div className="world-post-replies">
                    {(post.replies || []).map((reply) => (
                      <div className="world-post-reply" key={reply.id}>
                        <div className="world-post-thread-meta">
                          <strong>{reply.author_name}</strong>
                          <span>{formatPostTime(reply.created_at)}</span>
                          {currentUser?.id === reply.author_id ? (
                            <button
                              type="button"
                              className="world-post-delete-button"
                              disabled={Boolean(deletingId)}
                              onClick={() => handleDeleteReply(post.id, reply)}
                            >
                              {deletingId === reply.id ? "Deleting…" : "Delete"}
                            </button>
                          ) : null}
                        </div>
                        <p>{reply.body}</p>
                      </div>
                    ))}
                  </div>

                  {currentUser ? (
                    <form
                      className="world-posts-reply-compose"
                      onSubmit={(event) => handleCreateReply(event, post.id)}
                    >
                      <input
                        value={replyDrafts[post.id] || ""}
                        maxLength={1000}
                        placeholder="Write a reply..."
                        onChange={(event) =>
                          setReplyDrafts((current) => ({
                            ...current,
                            [post.id]: event.target.value
                          }))
                        }
                      />
                      <button
                        type="submit"
                        disabled={
                          isSaving || !(replyDrafts[post.id] || "").trim()
                        }
                      >
                        Reply
                      </button>
                    </form>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </div>
      )}
    </section>
  );
}
