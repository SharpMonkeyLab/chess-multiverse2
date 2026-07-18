"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { hasSupabaseConfig, supabase } from "@/lib/supabaseClient";
import { getWorldComplexity, getWorldPreviewImages } from "@/lib/worldData";

export default function HomeFeaturedWorlds() {
  const [worlds, setWorlds] = useState([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    async function loadFeatured() {
      if (!hasSupabaseConfig() || !supabase) {
        setStatus("");
        setWorlds([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("worlds")
          .select(
            "id, name, description, is_public, complexity_label, updated_at, world_data"
          )
          .eq("is_public", true)
          .order("updated_at", { ascending: false })
          .limit(3);

        if (error) {
          setWorlds([]);
          setStatus("");
          return;
        }

        setWorlds(data || []);
        setStatus("");
      } catch {
        setWorlds([]);
        setStatus("");
      }
    }

    loadFeatured();
  }, []);

  if (worlds.length === 0) {
    return (
      <div className="home-featured-empty">
        <p>
          {status ||
            "Featured universes will show up here once some are published. Browse the library or create one."}
        </p>
        <div className="home-action-row">
          <Link className="home-primary-link" href="/worlds">
            Browse Universes
          </Link>
          <Link className="home-secondary-link" href="/creator">
            Create Universe
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="home-featured-grid">
      {worlds.map((world, index) => {
        const worldForHelpers = {
          name: world.name,
          data: world.world_data,
          complexity_label: world.complexity_label
        };
        const previewImages = getWorldPreviewImages(worldForHelpers);
        const complexity = getWorldComplexity(worldForHelpers);

        return (
          <article
            className="home-featured-card"
            key={world.id}
            style={{ animationDelay: `${index * 80}ms` }}
          >
            <div className="home-featured-preview">
              {previewImages.backgroundImage && (
                <img
                  className="home-featured-bg"
                  src={previewImages.backgroundImage}
                  alt=""
                  aria-hidden="true"
                />
              )}
              <div className="home-featured-overlay" />
              {previewImages.boardSkinImage ? (
                <img
                  className="home-featured-board"
                  src={previewImages.boardSkinImage}
                  alt={`${world.name} board`}
                />
              ) : (
                <span className="home-featured-letter">
                  {world.name.slice(0, 1)}
                </span>
              )}
            </div>

            <div className="home-featured-copy">
              <span>{complexity}</span>
              <h3>{world.name}</h3>
              <div className="world-card-action-row world-card-action-row-inline">
                <Link
                  className="world-play-link"
                  href={`/worlds/${world.id}`}
                  title={`Enter ${world.name}`}
                >
                  Enter Universe
                </Link>
              </div>
              <p>
                {world.description
                  ? world.description.slice(0, 110) +
                    (world.description.length > 110 ? "…" : "")
                  : "A published universe ready for challengers."}
              </p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
