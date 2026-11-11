"use client";

import { useState } from "react";
import { AVATAR_COLORS, AVATAR_EMOJIS } from "@/lib/occasions";

export function AvatarPicker({
  emoji: initialEmoji = AVATAR_EMOJIS[0],
  color: initialColor = AVATAR_COLORS[0],
}: {
  emoji?: string;
  color?: string;
}) {
  const [emoji, setEmoji] = useState(initialEmoji);
  const [color, setColor] = useState(initialColor);

  return (
    <fieldset>
      <legend className="label">Seu bichinho</legend>
      <input type="hidden" name="emoji" value={emoji} />
      <input type="hidden" name="color" value={color} />
      <div className="flex items-center gap-4">
        <span className="avatar avatar-lg" style={{ background: color }} aria-hidden="true">
          {emoji}
        </span>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Cor de fundo">
          {AVATAR_COLORS.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={option === color}
              aria-label={`Cor ${AVATAR_COLORS.indexOf(option) + 1}`}
              onClick={() => setColor(option)}
              className="h-9 w-9 rounded-full"
              style={{
                background: option,
                boxShadow: option === color ? "0 0 0 3px var(--ink)" : "inset 0 0 0 1px rgb(0 0 0 / .12)",
              }}
            />
          ))}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-8 gap-1" role="radiogroup" aria-label="Bichinho">
        {AVATAR_EMOJIS.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={option === emoji}
            aria-label={option}
            onClick={() => setEmoji(option)}
            className="grid aspect-square place-items-center rounded-xl text-2xl"
            style={{
              background: option === emoji ? color : "transparent",
              boxShadow: option === emoji ? "0 0 0 2px var(--ink)" : "none",
            }}
          >
            {option}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
