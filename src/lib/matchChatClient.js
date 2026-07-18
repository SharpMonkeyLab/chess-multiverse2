import { hasSupabaseConfig, supabase } from "@/lib/supabaseClient";

const MESSAGE_SELECT = "id, session_id, author_id, body, created_at";

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
    console.warn("Could not load match chat authors:", error.message);
    return {};
  }

  const namesById = {};

  for (const profile of data || []) {
    namesById[profile.id] = profile.display_name || "Player";
  }

  return namesById;
}

function attachAuthorNames(messages, namesById) {
  return (messages || []).map((message) => ({
    ...message,
    author_name: namesById[message.author_id] || "Player"
  }));
}

export async function fetchSessionMessages(sessionId, limit = 100) {
  if (!sessionId || !hasSupabaseConfig() || !supabase) {
    return { messages: [], error: null };
  }

  try {
    const { data, error } = await supabase
      .from("play_session_messages")
      .select(MESSAGE_SELECT)
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return { messages: [], error };
    }

    const rows = (data || []).slice().reverse();
    const namesById = await loadDisplayNames(rows.map((row) => row.author_id));

    return {
      messages: attachAuthorNames(rows, namesById),
      error: null
    };
  } catch (error) {
    return { messages: [], error };
  }
}

export async function sendSessionMessage(sessionId, body) {
  if (!sessionId || !hasSupabaseConfig() || !supabase) {
    return {
      message: null,
      error: new Error("Match chat is only available in live sessions.")
    };
  }

  const trimmed = String(body || "").trim().slice(0, 500);

  if (!trimmed) {
    return { message: null, error: new Error("Message cannot be empty.") };
  }

  try {
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { message: null, error: new Error("Please sign in to chat.") };
    }

    const { data, error } = await supabase
      .from("play_session_messages")
      .insert({
        session_id: sessionId,
        author_id: user.id,
        body: trimmed
      })
      .select(MESSAGE_SELECT)
      .single();

    if (error) {
      return { message: null, error };
    }

    const namesById = await loadDisplayNames([data.author_id]);

    return {
      message: attachAuthorNames([data], namesById)[0],
      error: null
    };
  } catch (error) {
    return { message: null, error };
  }
}

export function subscribeToSessionMessages(sessionId, onInsert) {
  if (!sessionId || !hasSupabaseConfig() || !supabase) {
    return () => {};
  }

  const channel = supabase
    .channel(`play-session-messages-${sessionId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "play_session_messages",
        filter: `session_id=eq.${sessionId}`
      },
      async (payload) => {
        const row = payload.new;

        if (!row) return;

        const namesById = await loadDisplayNames([row.author_id]);
        onInsert(attachAuthorNames([row], namesById)[0]);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
