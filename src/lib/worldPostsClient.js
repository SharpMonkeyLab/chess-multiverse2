import { hasSupabaseConfig, supabase } from "@/lib/supabaseClient";

const POST_SELECT = "id, world_id, author_id, body, created_at, updated_at";
const REPLY_SELECT = "id, post_id, author_id, body, created_at";

async function loadDisplayNames(authorIds) {
  if (!authorIds.length || !hasSupabaseConfig() || !supabase) {
    return {};
  }

  const uniqueIds = [...new Set(authorIds.filter(Boolean))];

  if (uniqueIds.length === 0) {
    return {};
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", uniqueIds);

  if (error) {
    console.warn("Could not load post authors:", error.message);
    return {};
  }

  const namesById = {};

  for (const profile of data || []) {
    namesById[profile.id] = profile.display_name || "Player";
  }

  return namesById;
}

function withAuthorName(row, namesById) {
  return {
    ...row,
    author_name: namesById[row.author_id] || "Player"
  };
}

export async function fetchLatestPostsByWorldIds(worldIds) {
  if (!hasSupabaseConfig() || !supabase || !worldIds?.length) {
    return { postsByWorldId: {}, error: null };
  }

  try {
    const { data, error } = await supabase
      .from("world_posts")
      .select(POST_SELECT)
      .in("world_id", worldIds)
      .order("created_at", { ascending: false });

    if (error) {
      return { postsByWorldId: {}, error };
    }

    const postsByWorldId = {};
    const authorIds = [];

    for (const post of data || []) {
      if (postsByWorldId[post.world_id]) continue;
      postsByWorldId[post.world_id] = post;
      authorIds.push(post.author_id);
    }

    const namesById = await loadDisplayNames(authorIds);

    for (const worldId of Object.keys(postsByWorldId)) {
      postsByWorldId[worldId] = withAuthorName(
        postsByWorldId[worldId],
        namesById
      );
    }

    return { postsByWorldId, error: null };
  } catch (error) {
    return { postsByWorldId: {}, error };
  }
}

export async function fetchLatestWorldPost(worldId) {
  if (!hasSupabaseConfig() || !supabase || !worldId) {
    return { post: null, error: null };
  }

  try {
    const { data, error } = await supabase
      .from("world_posts")
      .select(POST_SELECT)
      .eq("world_id", worldId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return { post: null, error };
    }

    if (!data) {
      return { post: null, error: null };
    }

    const namesById = await loadDisplayNames([data.author_id]);

    return { post: withAuthorName(data, namesById), error: null };
  } catch (error) {
    return { post: null, error };
  }
}

export async function fetchWorldPostsWithReplies(worldId) {
  if (!hasSupabaseConfig() || !supabase || !worldId) {
    return { posts: [], error: new Error("Supabase is not configured.") };
  }

  try {
    const { data: posts, error } = await supabase
      .from("world_posts")
      .select(POST_SELECT)
      .eq("world_id", worldId)
      .order("created_at", { ascending: false });

    if (error) {
      return { posts: [], error };
    }

    const postRows = posts || [];
    const postIds = postRows.map((post) => post.id);

    let replyRows = [];

    if (postIds.length > 0) {
      const { data: replies, error: repliesError } = await supabase
        .from("world_post_replies")
        .select(REPLY_SELECT)
        .in("post_id", postIds)
        .order("created_at", { ascending: true });

      if (repliesError) {
        return { posts: [], error: repliesError };
      }

      replyRows = replies || [];
    }

    const namesById = await loadDisplayNames([
      ...postRows.map((post) => post.author_id),
      ...replyRows.map((reply) => reply.author_id)
    ]);

    const repliesByPostId = {};

    for (const reply of replyRows) {
      if (!repliesByPostId[reply.post_id]) {
        repliesByPostId[reply.post_id] = [];
      }

      repliesByPostId[reply.post_id].push(withAuthorName(reply, namesById));
    }

    return {
      posts: postRows.map((post) => ({
        ...withAuthorName(post, namesById),
        replies: repliesByPostId[post.id] || []
      })),
      error: null
    };
  } catch (error) {
    return { posts: [], error };
  }
}

export async function fetchRecentWorldPosts(limit = 8) {
  if (!hasSupabaseConfig() || !supabase) {
    return { posts: [], error: new Error("Supabase is not configured.") };
  }

  try {
    const { data, error } = await supabase
      .from("world_posts")
      .select(
        `${POST_SELECT}, worlds!inner(id, name, is_public)`
      )
      .eq("worlds.is_public", true)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return { posts: [], error };
    }

    const rows = data || [];
    const namesById = await loadDisplayNames(rows.map((row) => row.author_id));

    return {
      posts: rows.map((row) => ({
        ...withAuthorName(row, namesById),
        world_name: row.worlds?.name || "Universe"
      })),
      error: null
    };
  } catch (error) {
    return { posts: [], error };
  }
}

export async function createWorldPost(worldId, body) {
  if (!hasSupabaseConfig() || !supabase) {
    return { post: null, error: new Error("Supabase is not configured.") };
  }

  const trimmed = String(body || "").trim().slice(0, 2000);

  if (!trimmed) {
    return { post: null, error: new Error("Post cannot be empty.") };
  }

  try {
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { post: null, error: new Error("Please sign in to post.") };
    }

    const { data, error } = await supabase
      .from("world_posts")
      .insert({
        world_id: worldId,
        author_id: user.id,
        body: trimmed
      })
      .select(POST_SELECT)
      .single();

    if (error) {
      return { post: null, error };
    }

    const namesById = await loadDisplayNames([data.author_id]);

    return {
      post: { ...withAuthorName(data, namesById), replies: [] },
      error: null
    };
  } catch (error) {
    return { post: null, error };
  }
}

export async function createWorldPostReply(postId, body) {
  if (!hasSupabaseConfig() || !supabase) {
    return { reply: null, error: new Error("Supabase is not configured.") };
  }

  const trimmed = String(body || "").trim().slice(0, 1000);

  if (!trimmed) {
    return { reply: null, error: new Error("Reply cannot be empty.") };
  }

  try {
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { reply: null, error: new Error("Please sign in to reply.") };
    }

    const { data, error } = await supabase
      .from("world_post_replies")
      .insert({
        post_id: postId,
        author_id: user.id,
        body: trimmed
      })
      .select(REPLY_SELECT)
      .single();

    if (error) {
      return { reply: null, error };
    }

    const namesById = await loadDisplayNames([data.author_id]);

    return {
      reply: withAuthorName(data, namesById),
      error: null
    };
  } catch (error) {
    return { reply: null, error };
  }
}
