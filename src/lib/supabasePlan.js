// ================================
// SUPABASE DATA MODEL PLAN
// ================================
//
// This file is a planning document for the future online version of
// Chess Multiverse.
//
// It does not run any code yet.
// It exists so we can design the database carefully before connecting Supabase.
//
// Current app mode:
// - Worlds are saved locally in browser localStorage.
// - JSON export/import is used for sharing.
// - The Creator is fully local/offline.
// - Community Worlds are only preview/mock data.
//
// Future app mode:
// - Users can create accounts.
// - Worlds can be saved online.
// - Users can publish worlds publicly.
// - Other users can browse, favourite, rate, and play public worlds.
// - Lobby challenges and play sessions can be stored online.
// - Real-time multiplayer can be added later.


// ================================
// TABLE 1: profiles
// ================================
//
// Purpose:
// Stores public user/profile information connected to Supabase Auth.
//
// Supabase Auth already stores login identity.
// This table stores game-platform identity.
//
// Suggested columns:
//
// id
// - uuid
// - primary key
// - same value as auth.users.id
//
// display_name
// - text
// - shown publicly as the creator name
//
// username
// - text
// - unique
// - optional later, useful for profile URLs
//
// avatar_url
// - text
// - optional later when image uploads exist
//
// bio
// - text
// - optional creator profile description
//
// created_at
// - timestamp
//
// updated_at
// - timestamp
//
// Future use:
// - show creator name on world cards
// - profile pages
// - creator galleries
// - public identity in lobby/matches


// ================================
// TABLE 2: worlds
// ================================
//
// Status:
// - Created in Supabase in Stage 3 — Lesson 24.
// - App save/load connection still pending.
//
// Purpose:
// Stores the main world data online.
//
// This is the online version of a local saved world.
//
// Suggested columns:
//
// id
// - uuid
// - primary key
//
// owner_id
// - uuid
// - references profiles.id
// - who created/owns the world
//
// name
// - text
// - fast display/search field
//
// slug
// - text
// - unique per world or unique per creator
// - used for clean URLs later
//
// description
// - text
// - fast display/search field
//
// rules_notes
// - text
// - fast display/search field
//
// world_data
// - jsonb
// - stores the full world object:
//   - worldDetails
//   - worldTheme
//   - worldMechanics
//   - worldFeatures
//   - characterLibrary
//   - worldTokens
//   - pieceNames
//   - pieceNameLocked
//
// is_public
// - boolean
// - false by default
// - determines whether the world appears in Community Worlds
//
// cover_image_url
// - text
// - optional later
// - custom world cover image
//
// rating_average
// - numeric
// - public card stat later
//
// rating_count
// - integer
// - number of ratings/reviews
//
// active_player_count
// - integer
// - temporary/cache value later
//
// total_match_count
// - integer
// - total games played using this world
//
// favourite_count
// - integer
// - number of users who saved/favourited this world
//
// complexity_label
// - text
// - Basic / Moderate / Advanced (legacy: Simple / Standard)
// - can be user-chosen later or calculated
//
// created_at
// - timestamp
//
// updated_at
// - timestamp
//
// Future use:
// - My Online Worlds
// - Community Worlds
// - World Details pages
// - public sharing
// - search/filter/sort worlds


// ================================
// TABLE 3: world_versions
// ================================
//
// Purpose:
// Stores snapshots of worlds over time.
//
// This is useful because published worlds may change.
// A play session should know which version of a world it used.
//
// Suggested columns:
//
// id
// - uuid
// - primary key
//
// world_id
// - uuid
// - references worlds.id
//
// version_number
// - integer
// - 1, 2, 3, etc.
//
// world_data
// - jsonb
// - snapshot of the full world at that version
//
// change_notes
// - text
// - optional creator notes like "balanced fire terrain"
//
// created_at
// - timestamp
//
// Future use:
// - version history
// - undo published changes
// - play sessions tied to a stable rule set
// - public changelogs


// ================================
// TABLE 4: lobby_challenges
// ================================
//
// Purpose:
// Stores open challenges in the Lobby.
//
// A challenge is an invitation to play a world.
//
// Suggested columns:
//
// id
// - uuid
// - primary key
//
// host_id
// - uuid
// - references profiles.id
//
// world_id
// - uuid
// - references worlds.id
//
// world_version_id
// - uuid
// - references world_versions.id
// - optional at first, useful later
//
// title
// - text
// - optional custom challenge name
//
// status
// - text
// - examples:
//   - open
//   - character_select
//   - in_progress
//   - completed
//   - cancelled
//
// max_players
// - integer
// - probably 2 first
//
// created_at
// - timestamp
//
// expires_at
// - timestamp
// - optional cleanup later
//
// Future use:
// - Lobby page
// - open tables
// - challenge invites
// - starting Play Setup / character selection


// ================================
// TABLE 5: play_sessions
// ================================
//
// Purpose:
// Stores active or completed matches.
//
// This is different from a world.
// A world is the rules/template.
// A play session is one actual game using that world.
//
// Suggested columns:
//
// id
// - uuid
// - primary key
//
// world_id
// - uuid
// - references worlds.id
//
// world_version_id
// - uuid
// - references world_versions.id
//
// challenge_id
// - uuid
// - references lobby_challenges.id
// - optional
//
// host_id
// - uuid
// - references profiles.id
//
// status
// - text
// - examples:
//   - setup
//   - active
//   - paused
//   - completed
//
// game_state
// - jsonb
// - stores actual match state:
//   - board cells
//   - current turn
//   - selected characters
//   - timers later
//   - counters/conditions during the match
//
// created_at
// - timestamp
//
// updated_at
// - timestamp
//
// completed_at
// - timestamp
// - optional
//
// Future use:
// - save online games
// - resume games
// - match history
// - real-time multiplayer state


// ================================
// TABLE 6: world_favourites
// ================================
//
// Purpose:
// Allows users to save/favourite public worlds.
//
// Suggested columns:
//
// id
// - uuid
// - primary key
//
// user_id
// - uuid
// - references profiles.id
//
// world_id
// - uuid
// - references worlds.id
//
// created_at
// - timestamp
//
// Future use:
// - Saved Worlds
// - favourites count
// - recommendations later


// ================================
// TABLE 7: world_ratings
// ================================
//
// Purpose:
// Allows users to rate/review worlds.
//
// Suggested columns:
//
// id
// - uuid
// - primary key
//
// user_id
// - uuid
// - references profiles.id
//
// world_id
// - uuid
// - references worlds.id
//
// rating
// - integer
// - probably 1 to 5
//
// review_text
// - text
// - optional
//
// created_at
// - timestamp
//
// updated_at
// - timestamp
//
// Future use:
// - rating_average
// - rating_count
// - reviews on World Details page


// ================================
// TABLE 8: world_assets
// ================================
//
// Status:
// - Storage bucket `world-assets` created in Stage 3 — Lesson 28.
// - Storage policies created for public read and owner-folder write access.
// - Asset upload helpers created in Stage 3 — Lesson 29.
// - App Save Online image conversion still pending.
//
// Purpose:
// Tracks uploaded images/assets once we use Supabase Storage.
//
// Suggested columns:
//
// id
// - uuid
// - primary key
//
// world_id
// - uuid
// - references worlds.id
//
// owner_id
// - uuid
// - references profiles.id
//
// asset_type
// - text
// - examples:
//   - cover_image
//   - board_skin
//   - background
//   - piece_skin
//   - terrain_image
//   - character_portrait
//
// storage_path
// - text
// - path inside Supabase Storage
//
// public_url
// - text
// - generated public URL if asset is public
//
// created_at
// - timestamp
//
// Future use:
// - cloud images
// - public worlds with image assets
// - replacing local base64 images


// ================================
// IMPORTANT DATA SEPARATION
// ================================
//
// World data:
// - reusable rules and content
// - saved in worlds.world_data
//
// Test game data:
// - local test board state while designing
// - currently local only
// - later may become play_sessions.game_state if online
//
// Play session data:
// - one actual match
// - includes board cells, turn, selected characters, temporary counters, etc.
//
// This separation matters because:
// - editing a world should not overwrite someone else's active match
// - saving a game should not change the public world rules
// - world versions can preserve old rule sets


// ================================
// FIRST SUPABASE MILESTONE
// ================================
//
// Do NOT build everything at once.
//
// First Supabase milestone should probably be:
//
// 1. Install Supabase client.
// 2. Add environment variables.
// 3. Create profiles table.
// 4. Add sign up / sign in / sign out.
// 5. Show logged-in user on /account.
//
// Second milestone:
//
// 1. Create worlds table.
// 2. Save a world online.
// 3. Load user's online worlds.
// 4. Keep local save/export as backup.
//
// Third milestone:
//
// 1. Publish/unpublish worlds.
// 2. Community Worlds reads public worlds.
// 3. World Details works with online worlds.
//
// Later milestones:
//
// 1. Supabase Storage for images.
// 2. Lobby challenges.
// 3. Play sessions.
// 4. Real-time multiplayer.


// ================================
// TABLE: lobby_messages (Social v1)
// ================================
//
// Purpose:
// Global lobby chat shown on /lobby.
//
// See supabase/social_v1.sql for CREATE + RLS.
//
// Columns:
// - id uuid pk
// - author_id → profiles.id
// - body text (1–500 chars)
// - created_at
//
// RLS: anyone can select; insert only as auth.uid() = author_id
// Realtime: enable INSERT on this table


// ================================
// TABLE: world_posts (Social v1)
// ================================
//
// Purpose:
// Creator update posts per published world (Enter World + Worlds card teaser).
// v1 authors = world owner only (cocreators later).
//
// Columns:
// - id uuid pk
// - world_id → worlds.id
// - author_id → profiles.id
// - body text (1–2000 chars)
// - created_at / updated_at
//
// RLS: select if world public or owner; insert if author is world owner;
// delete if auth.uid() = author_id


// ================================
// TABLE: world_post_replies (Social v1)
// ================================
//
// Purpose:
// Player replies under a world post.
//
// Columns:
// - id uuid pk
// - post_id → world_posts.id
// - author_id → profiles.id
// - body text (1–1000 chars)
// - created_at
//
// RLS: select with parent post visibility; any signed-in user may insert as self;
// delete if auth.uid() = author_id


// ================================
// TABLE: play_session_messages (In-match chat)
// ================================
//
// Purpose:
// Private chat for players in a live play session.
//
// See supabase/match_chat_v1.sql for CREATE + RLS.
//
// Columns:
// - id uuid pk
// - session_id → play_sessions.id
// - author_id → profiles.id
// - body text (1–500 chars)
// - created_at
//
// RLS: select/insert only if user is a participant on that session
// Realtime: enable INSERT on play_session_messages
