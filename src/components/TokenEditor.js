"use client";

import { useState } from "react";
import { GENERIC_TOKEN_SYMBOL } from "@/lib/defaultWorld";

export default function TokenEditor({
  worldTokens,
  onAddWorldToken,
  onDeleteWorldToken
}) {
  const [tokenName, setTokenName] = useState("");

  const tokenList = Object.values(worldTokens).sort((a, b) =>
    a.label.localeCompare(b.label)
  );

  function handleAddToken() {
    onAddWorldToken(tokenName);
    setTokenName("");
  }

  return (
    <div className="token-editor">
      <p className="small muted">
        Add general tokens available in this universe. These can be placed from the token tray.
      </p>

      <label>Token Name</label>
      <input
        value={tokenName}
        placeholder="e.g. Wall, Trap, Portal"
        onChange={(event) => setTokenName(event.target.value)}
      />

      <button type="button" onClick={handleAddToken}>
        Add Token
      </button>

      <div className="token-editor-list">
        {tokenList.length === 0 ? (
          <p className="small muted">No universe tokens yet.</p>
        ) : (
          tokenList.map((token) => (
            <div className="token-editor-item" key={token.name}>
              <span className="token-editor-symbol">{GENERIC_TOKEN_SYMBOL}</span>
              <span>{token.label}</span>

              <button
                type="button"
                onClick={() => onDeleteWorldToken(token.name)}
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}