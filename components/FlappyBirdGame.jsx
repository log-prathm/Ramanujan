"use client";

import { useEffect, useRef, useState } from "react";

const GAME = {
  width: 360,
  height: 640,
  gravity: 0.23,
  jump: -4.6,
  maxFall: 8.5,
  pipeGap: 165,
  pipeWidth: 56,
  pipeSpeed: 2.05
};

function getDeviceId() {
  if (typeof window === "undefined") return "server";
  const key = "ra_device_id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id =
    "dev_" +
    Math.random().toString(36).slice(2) +
    Date.now().toString(36).slice(-6);
  localStorage.setItem(key, id);
  return id;
}

async function detectLocalIp() {
  if (typeof window === "undefined" || !window.RTCPeerConnection) return null;
  return new Promise((resolve) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(null);
      }
    }, 1200);

    const pc = new RTCPeerConnection({ iceServers: [] });
    pc.createDataChannel("x");
    pc.onicecandidate = (event) => {
      if (!event.candidate || settled) return;
      const candidate = event.candidate.candidate || "";
      const match = candidate.match(/(\d{1,3}(?:\.\d{1,3}){3})/);
      if (match?.[1]) {
        settled = true;
        clearTimeout(timeout);
        resolve(match[1]);
        pc.close();
      }
    };

    pc.createOffer()
      .then((offer) => pc.setLocalDescription(offer))
      .catch(() => {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          resolve(null);
        }
      });
  });
}

export default function FlappyBirdGame() {
  const canvasRef = useRef(null);
  const frameRef = useRef(0);
  const lastTsRef = useRef(0);
  const spawnTimerRef = useRef(0);
  const bestSentRef = useRef(0);
  const usernameRef = useRef("");
  const localIpRef = useRef(null);
  const stateRef = useRef({
    birdY: 220,
    velocity: 0,
    pipes: [],
    score: 0,
    over: false,
    started: false,
    tick: 0
  });

  const [score, setScore] = useState(0);
  const [username, setUsername] = useState("");
  const [leaderboard, setLeaderboard] = useState([]);
  const [status, setStatus] = useState("Tap to start");
  const [localIp, setLocalIp] = useState(null);

  useEffect(() => {
    setUsername(localStorage.getItem("ra_username") || "");
    detectLocalIp().then(setLocalIp);
    fetchLeaderboard();
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  useEffect(() => {
    localStorage.setItem("ra_username", username.slice(0, 18));
    usernameRef.current = username.slice(0, 18);
  }, [username]);

  useEffect(() => {
    localIpRef.current = localIp;
  }, [localIp]);

  async function fetchLeaderboard() {
    const res = await fetch("/api/leaderboard?game=flappy-bird");
    const data = await res.json();
    if (data.ok) setLeaderboard(data.leaderboard);
  }

  async function submitScore(finalScore) {
    if (finalScore <= bestSentRef.current) return;
    bestSentRef.current = finalScore;
    const payload = {
      game: "flappy-bird",
      username: usernameRef.current || "Player",
      score: finalScore,
      deviceId: getDeviceId(),
      localIp: localIpRef.current
    };
    const res = await fetch("/api/submit-score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.ok) fetchLeaderboard();
  }

  function resetGame() {
    stateRef.current = {
      birdY: 220,
      velocity: 0,
      pipes: [],
      score: 0,
      over: false,
      started: true,
      tick: 0
    };
    setScore(0);
    setStatus("Playing");
    spawnTimerRef.current = 0;
  }

  function flap() {
    const s = stateRef.current;
    if (!s.started) {
      resetGame();
      stateRef.current.velocity = GAME.jump;
      return;
    }
    if (s.over) {
      resetGame();
      stateRef.current.velocity = GAME.jump;
      return;
    }
    s.velocity = GAME.jump;
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        flap();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const ctx = canvasRef.current.getContext("2d");

    const draw = (ts) => {
      const s = stateRef.current;
      const lastTs = lastTsRef.current || ts;
      let dt = (ts - lastTs) / 1000;
      if (dt > 0.035) dt = 0.035;
      lastTsRef.current = ts;
      const dtNorm = dt * 60;
      s.tick += dtNorm;

      if (s.started && !s.over) {
        s.velocity += GAME.gravity * dtNorm;
        if (s.velocity > GAME.maxFall) s.velocity = GAME.maxFall;
        s.birdY += s.velocity * dtNorm;

        spawnTimerRef.current += dt;
        if (spawnTimerRef.current >= 1.58) {
          spawnTimerRef.current = 0;
          const top = 90 + Math.random() * 260;
          s.pipes.push({
            x: GAME.width + 40,
            top
          });
        }

        s.pipes.forEach((p) => {
          p.x -= GAME.pipeSpeed * dtNorm;
        });
        s.pipes = s.pipes.filter((p) => p.x > -GAME.pipeWidth - 20);

        const birdX = 78;
        const birdR = 14;
        for (const p of s.pipes) {
          const inX = birdX + birdR > p.x && birdX - birdR < p.x + GAME.pipeWidth;
          const hitTop = s.birdY - birdR < p.top;
          const hitBottom = s.birdY + birdR > p.top + GAME.pipeGap;
          if (inX && (hitTop || hitBottom)) {
            s.over = true;
          }
          if (!p.counted && p.x + GAME.pipeWidth < birdX - birdR) {
            p.counted = true;
            s.score += 1;
            setScore(s.score);
          }
        }

        if (s.birdY > GAME.height - 28 || s.birdY < 20) {
          s.over = true;
        }

        if (s.over) {
          setStatus("Game Over - Tap to restart");
          submitScore(s.score);
        }
      }

      ctx.clearRect(0, 0, GAME.width, GAME.height);

      const sky = ctx.createLinearGradient(0, 0, 0, GAME.height);
      sky.addColorStop(0, "#2a3d8f");
      sky.addColorStop(1, "#0d1129");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, GAME.width, GAME.height);

      ctx.fillStyle = "rgba(255,255,255,0.07)";
      for (let i = 0; i < 24; i += 1) {
        ctx.fillRect((i * 31 + s.tick * 0.65) % GAME.width, (i * 53) % GAME.height, 2, 2);
      }

      ctx.fillStyle = "#6adb74";
      s.pipes.forEach((p) => {
        ctx.fillRect(p.x, 0, GAME.pipeWidth, p.top);
        ctx.fillRect(p.x, p.top + GAME.pipeGap, GAME.pipeWidth, GAME.height);
      });

      const birdX = 78;
      const birdY = s.birdY;
      ctx.beginPath();
      ctx.arc(birdX, birdY, 14, 0, Math.PI * 2);
      ctx.fillStyle = "#f8d84f";
      ctx.fill();
      ctx.closePath();

      // Eye
      ctx.beginPath();
      ctx.arc(birdX + 4, birdY - 4, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = "#111";
      ctx.fill();
      ctx.closePath();

      // Beak
      ctx.beginPath();
      ctx.moveTo(birdX + 13, birdY);
      ctx.lineTo(birdX + 21, birdY - 2);
      ctx.lineTo(birdX + 13, birdY + 4);
      ctx.fillStyle = "#ff9f43";
      ctx.fill();
      ctx.closePath();

      ctx.fillStyle = "#fff";
      ctx.font = "bold 28px monospace";
      ctx.fillText(String(s.score), 16, 40);

      if (!s.started) {
        ctx.font = "bold 20px monospace";
        ctx.fillText("Tap to start", 98, GAME.height / 2);
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  return (
    <section className="flappy-wrap">
      <div className="panel game-panel">
        <label htmlFor="username">Username (anonymous)</label>
        <input
          id="username"
          maxLength={18}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Player"
        />
        <div className="status">
          <span>{status}</span>
          <span>Score: {score}</span>
        </div>
        <canvas
          ref={canvasRef}
          width={GAME.width}
          height={GAME.height}
          className="flappy-canvas"
          onPointerDown={flap}
        />
        <button className="flap-btn" onClick={flap}>
          Tap / Jump
        </button>
      </div>

      <div className="panel board-panel">
        <h2>Leaderboard</h2>
        <ol>
          {leaderboard.map((row, idx) => (
            <li key={`${row.username}-${idx}`}>
              <span>{idx + 1}. {row.username}</span>
              <strong>{row.score}</strong>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
