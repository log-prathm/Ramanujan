"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const easterEggs = [
  { icon: "/\\", label: "Space Invaders Shield", hint: "Tap 3x quickly" },
  { icon: "()", label: "Pac-Dot Trail", hint: "Hover to reveal" },
  { icon: "[]", label: "Tetris Ghost Block", hint: "Double click card" },
  { icon: "++", label: "Contra Core", hint: "Try Konami code" }
];

export default function HomePage() {
  const [message, setMessage] = useState("Find the hidden callbacks to old games.");
  const [tapCount, setTapCount] = useState(0);

  useEffect(() => {
    const seq = [
      "ArrowUp",
      "ArrowUp",
      "ArrowDown",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "ArrowLeft",
      "ArrowRight",
      "b",
      "a"
    ];
    let i = 0;
    const onKey = (e) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (key === seq[i]) i += 1;
      else i = 0;
      if (i === seq.length) {
        setMessage("Konami code unlocked: +30 aura, no extra lives.");
        i = 0;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onShieldTap = () => {
    const next = tapCount + 1;
    setTapCount(next);
    if (next >= 3) {
      setMessage("Space Invaders shield powered up.");
      setTapCount(0);
    }
  };

  return (
    <main className="home-shell">
      <div className="noise" />
      <header className="hero">
        <p className="eyebrow">Ramanujan Retro Arcade</p>
        <h1>Anonymous Competition, Pure Old-School Vibes</h1>
        <p>
          No sign-ins. Pick a username, play fast, and climb the leaderboard.
          Device identity is local-only with optional local-IP signal.
        </p>
        <p className="egg-message">{message}</p>
        <Link className="cta" href="/games/flappy">
          Launch Flappy Bird
        </Link>
      </header>

      <section className="easter-grid">
        {easterEggs.map((egg, idx) => (
          <article
            className="egg-card"
            key={egg.label}
            onClick={idx === 0 ? onShieldTap : undefined}
            onMouseEnter={
              idx === 1 ? () => setMessage("Pac-Dot trail detected in sector 8.") : undefined
            }
            onDoubleClick={
              idx === 2 ? () => setMessage("Tetris ghost block aligned perfectly.") : undefined
            }
          >
            <span className="egg-icon">{egg.icon}</span>
            <h2>{egg.label}</h2>
            <p>{egg.hint}</p>
          </article>
        ))}
      </section>

      <section className="games">
        <h2>Game Portal</h2>
        <div className="game-list">
          <Link href="/games/flappy" className="game-item active">
            Flappy Bird
          </Link>
          <div className="game-item disabled">Snake (coming soon)</div>
          <div className="game-item disabled">Breakout (coming soon)</div>
        </div>
      </section>
    </main>
  );
}
