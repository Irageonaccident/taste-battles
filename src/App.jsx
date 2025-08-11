import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * Taste Battles – Clickable UX Prototype (v2 + patch)
 * - Button: inline styles (no dynamic Tailwind)
 * - Timer: reset when `running` starts to avoid overlap
 * - TrackPanel: robust YouTube ID parsing (youtube.com & youtu.be)
 * - Keeps all your v2 behavior (Start Bracket, Sample Deck, etc.)
 */

// ---- Design Tokens (Figma-ready) -------------------------------------------
const TOKENS = {
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Noto Sans, Ubuntu, Cantarell, Helvetica Neue, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
  colors: {
    primary: "#7C3AED",
    bg: "#111827",
    surface: "#1F2937",
    text: "#F9FAFB",
    success: "#10B981",
    error: "#EF4444",
    warning: "#F59E0B",
    info: "#60A5FA",
    muted: "#6B7280",
    border: "#374151",
    overlay: "rgba(17,24,39,0.8)",
  },
  radius: { sm: "8px", md: "12px", lg: "16px", xl: "20px", full: "999px" },
  shadow: {
    soft: "0 6px 24px rgba(0,0,0,0.25)",
    lift: "0 10px 30px rgba(0,0,0,0.35)",
  },
};

function cls(...a) {
  return a.filter(Boolean).join(" ");
}

function Card({ className = "", children }) {
  return (
    <div
      className={cls("rounded-2xl p-5", className)}
      style={{
        background: TOKENS.colors.surface,
        boxShadow: TOKENS.shadow.soft,
        border: `1px solid ${TOKENS.colors.border}`,
      }}
    >
      {children}
    </div>
  );
}

/* ---------- PATCHED BUTTON (no dynamic Tailwind colors) ---------- */
function Button({
  variant = "primary",
  size = "md",
  loading,
  disabled,
  children,
  className = "",
  onClick,
  title,
}) {
  const base =
    "inline-flex items-center justify-center rounded-xl font-medium transition-all active:scale-[0.98]";
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-3 text-base",
  };
  const palette = {
    primary: { bg: TOKENS.colors.primary, fg: TOKENS.colors.text },
    secondary: { bg: "#2B3442", fg: TOKENS.colors.text },
    ghost: {
      bg: "transparent",
      fg: TOKENS.colors.text,
      border: TOKENS.colors.border,
    },
    danger: { bg: TOKENS.colors.error, fg: "#fff" },
  };
  const p = palette[variant] ?? palette.primary;

  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled || loading}
      className={cls(base, sizes[size], className)}
      style={{
        background: p.bg,
        color: p.fg,
        border: variant === "ghost" ? `1px solid ${p.border}` : undefined,
        opacity: disabled || loading ? 0.6 : 1,
        cursor: disabled || loading ? "not-allowed" : "pointer",
      }}
    >
      {loading && <span className="mr-2">⏳</span>}
      {children}
    </button>
  );
}

function Input({
  label,
  placeholder,
  error,
  helper,
  value,
  onChange,
  type = "text",
  right,
  left,
  disabled,
}) {
  return (
    <label className="block w-full">
      {label && (
        <div className="mb-1 text-sm" style={{ color: TOKENS.colors.muted }}>
          {label}
        </div>
      )}
      <div className="relative">
        {left && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 opacity-70">
            {left}
          </div>
        )}
        <input
          disabled={disabled}
          type={type}
          className="w-full rounded-xl bg-[#0F1623] border outline-none focus:ring-2 px-3 py-2 pr-10"
          style={{
            color: TOKENS.colors.text,
            borderColor: error ? TOKENS.colors.error : TOKENS.colors.border,
          }}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
        />
        {right && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-70">
            {right}
          </div>
        )}
      </div>
      {helper && !error && (
        <div className="mt-1 text-xs" style={{ color: TOKENS.colors.muted }}>
          {helper}
        </div>
      )}
      {error && (
        <div className="mt-1 text-xs" style={{ color: TOKENS.colors.error }}>
          {error}
        </div>
      )}
    </label>
  );
}

function Badge({ children, tone = "info", className = "" }) {
  const bg =
    {
      info: TOKENS.colors.info,
      success: TOKENS.colors.success,
      error: TOKENS.colors.error,
      warning: TOKENS.colors.warning,
      neutral: TOKENS.colors.border,
    }[tone] || TOKENS.colors.info;
  return (
    <span
      className={cls(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        className
      )}
      style={{ background: bg, color: "#081016" }}
    >
      {children}
    </span>
  );
}

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast.sticky) {
      const t = setTimeout(onClose, toast.duration ?? 2200);
      return () => clearTimeout(t);
    }
  }, [toast, onClose]);
  return (
    <div
      className="rounded-xl px-4 py-3 text-sm flex items-center gap-3"
      style={{
        background: TOKENS.colors.surface,
        color: TOKENS.colors.text,
        border: `1px solid ${TOKENS.colors.border}`,
        boxShadow: TOKENS.shadow.lift,
      }}
    >
      <span>{toast.icon ?? "🔔"}</span>
      <div className="flex-1">
        <div className="font-medium">{toast.title}</div>
        {toast.desc && <div className="opacity-80">{toast.desc}</div>}
      </div>
      <button onClick={onClose} className="opacity-70 hover:opacity-100">
        ✕
      </button>
    </div>
  );
}

function useToasts() {
  const [toasts, setToasts] = useState([]);
  const push = (t) =>
    setToasts((s) => [...s, { id: Math.random().toString(36).slice(2), ...t }]);
  const remove = (id) => setToasts((s) => s.filter((x) => x.id !== id));
  return { toasts, push, remove };
}

/* ---------- PATCHED TIMER ---------- */
function Timer({ seconds, running, onDone, label }) {
  const [left, setLeft] = useState(seconds);

  // Reset whenever we (re)start the timer
  useEffect(() => {
    if (running) setLeft(seconds);
  }, [seconds, running]);

  useEffect(() => {
    if (!running) return;
    if (left <= 0) {
      onDone?.();
      return;
    }
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left, running, onDone]);

  const pct = Math.max(0, Math.min(100, (left / seconds) * 100));
  return (
    <div>
      <div
        className="flex items-center justify-between text-xs mb-1"
        style={{ color: TOKENS.colors.muted }}
      >
        <span>{label}</span>
        <span>{left}s</span>
      </div>
      <div
        className="w-full h-2 rounded-full overflow-hidden"
        style={{
          background: "#0B1220",
          border: `1px solid ${TOKENS.colors.border}`,
        }}
      >
        <div
          className="h-full"
          style={{
            width: `${pct}%`,
            background: TOKENS.colors.primary,
            transition: "width 1s linear",
          }}
        />
      </div>
    </div>
  );
}

// ---- Sample Data -----------------------------------------------------------
const SAMPLE_USERS = [1, 2, 3, 4].map((i) => ({
  id: `u${i}`,
  name: `Test User ${i}`,
  rating: 1200,
  provisional_count: 0,
}));
const YT = [
  "fJ9rUzIMcZQ",
  "BciS5krYL80",
  "QkF3oxkcmNs",
  "1w7OgIMMRc4",
  "YkgkThdzX-8",
]; // ids only
function ytThumb(id) {
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

const DEFAULT_DECK = YT.map((id, i) => ({
  title: `Track ${i + 1}`,
  artist: "Example Artist",
  source: "youtube",
  url: `https://www.youtube.com/watch?v=${id}`,
  hook_start_sec: i * 5,
}));
function validateTrackUrl(url) {
  try {
    const u = new URL(url);
    return /youtube\.com|youtu\.be|open\.spotify\.com/.test(u.hostname);
  } catch {
    return false;
  }
}

/* ---------- PATCH: safe YT ID helper ---------- */
function safeYouTubeId(url, fallbackId) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace("/", "");
      return id || fallbackId || null;
    }
    if (u.hostname.includes("youtube.com")) {
      return u.searchParams.get("v") || fallbackId || null;
    }
  } catch {}
  return fallbackId || null;
}

// ---- App ------------------------------------------------------------------
export default function App() {
  const [route, setRoute] = useState("home");
  const [user, setUser] = useState({
    id: "u1",
    name: "Test User 1",
    rating: 1200,
    provisional_count: 2,
  });
  const [authed, setAuthed] = useState(false);
  const [lobby, setLobby] = useState({
    id: "#ABCD12",
    size: 4,
    state: "waiting",
    players: [null, null, null, null],
    ready: false,
  });
  const [match, setMatch] = useState(null);
  const toasts = useToasts();

  useEffect(() => {
    document.body.style.background = TOKENS.colors.bg;
    document.body.style.color = TOKENS.colors.text;
    document.body.style.fontFamily = TOKENS.fontFamily;
  }, []);

  const IntegrationTag = ({ label }) => (
    <span
      className="ml-2 text-[10px] px-2 py-0.5 rounded-full"
      style={{
        background: "#0D1423",
        border: `1px dashed ${TOKENS.colors.border}`,
        color: TOKENS.colors.muted,
      }}
    >
      API: {label}
    </span>
  );

  const Header = () => (
    <div
      className="sticky top-0 z-30"
      style={{
        background:
          "linear-gradient(180deg, rgba(17,24,39,0.9), rgba(17,24,39,0.6))",
        backdropFilter: "blur(8px)",
      }}
    >
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-2xl flex items-center justify-center"
            style={{ background: TOKENS.colors.primary }}
          >
            🎵
          </div>
          <div>
            <div className="text-lg font-semibold">Taste Battles</div>
            <div className="text-xs opacity-70">Sloppy Songs</div>
          </div>
        </div>
        <nav className="flex items-center gap-2 text-sm">
          <NavLink
            label="Home"
            active={route === "home"}
            onClick={() => setRoute("home")}
          />
          <NavLink
            label="Leaderboard"
            active={route === "leaderboard"}
            onClick={() => setRoute("leaderboard")}
          />
          <NavLink
            label="Profile"
            active={route === "profile"}
            onClick={() => setRoute("profile")}
          />
          <NavLink
            label={authed ? "Sign out" : "Sign in"}
            onClick={() => setRoute("auth")}
          />
        </nav>
      </div>
    </div>
  );
  function NavLink({ label, onClick, active }) {
    return (
      <button
        onClick={onClick}
        className={cls(
          "px-3 py-1.5 rounded-lg",
          active ? "bg-[#222A38]" : "hover:bg-[#1A2231]"
        )}
      >
        {label}
      </button>
    );
  }

  // ---- Screens -------------------------------------------------------------
  const Home = () => (
    <div className="max-w-6xl mx-auto px-4 pt-10 pb-24">
      <div className="grid md:grid-cols-2 gap-8 items-center">
        <div>
          <h1 className="text-3xl md:text-4xl font-semibold mb-3">
            Battle your music taste in real time.
          </h1>
          <p className="opacity-80 mb-6">
            Four players enter. Submit five songs, face off in a best-of-3 with
            live voting. Climb the leaderboard with Elo ratings.
          </p>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => {
                if (!authed) {
                  setRoute("auth");
                  return;
                }
                toasts.push({ title: "Finding match…", icon: "🎯" });
                setRoute("lobby");
              }}
            >
              Find Match
            </Button>
            <IntegrationTag label="lobby:create / lobby:join" />
          </div>
        </div>
        <Card>
          <div className="grid grid-cols-2 gap-4">
            {[
              { t: "4-player bracket", i: "🧩" },
              { t: "Best-of-3 rounds", i: "🥊" },
              { t: "Live voting", i: "🗳️" },
              { t: "Elo ratings", i: "📈" },
            ].map((x, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border"
                style={{
                  borderColor: TOKENS.colors.border,
                  background: "#0F1623",
                }}
              >
                <div className="text-2xl mb-2">{x.i}</div>
                <div className="text-sm">{x.t}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-xs opacity-70">
            Future section reserved for <b>Playlists</b> management in
            sidebar/navigation.
          </div>
        </Card>
      </div>
    </div>
  );

  const Auth = () => {
    const [email, setEmail] = useState("");
    const [sent, setSent] = useState(false);
    const [err, setErr] = useState("");
    return (
      <div className="max-w-md mx-auto px-4 pt-12 pb-24">
        <Card>
          <div className="text-xl font-semibold mb-1">Sign in</div>
          <div className="text-sm opacity-80 mb-4">
            Magic link or social. Guest is allowed.
          </div>
          {!sent ? (
            <div className="space-y-3">
              <Input
                label="Email"
                placeholder="you@domain.com"
                value={email}
                onChange={setEmail}
                error={err}
              />
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => {
                    const valid = /.+@.+\..+/.test(email);
                    if (!valid) {
                      setErr("Invalid email");
                      toasts.push({ title: "Invalid email", icon: "⚠️" });
                      return;
                    }
                    setErr("");
                    setSent(true);
                    toasts.push({ title: "Check your email", icon: "📨" });
                  }}
                >
                  Send magic link
                </Button>
                <IntegrationTag label="auth:magic_link" />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setAuthed(true);
                    setRoute("home");
                    toasts.push({ title: "Signed in with Google", icon: "✅" });
                  }}
                >
                  Sign in with Google
                </Button>
                <IntegrationTag label="auth:oauth_google" />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setAuthed(true);
                    setRoute("home");
                    toasts.push({ title: "Continuing as Guest", icon: "👤" });
                  }}
                >
                  Continue as Guest
                </Button>
                <IntegrationTag label="auth:guest" />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Badge tone="info">Magic link sent</Badge>
              <div className="text-sm">Check your email to continue.</div>
              <Button
                onClick={() => {
                  setAuthed(true);
                  setRoute("home");
                }}
              >
                Back to Home
              </Button>
            </div>
          )}
        </Card>
      </div>
    );
  };

  const Lobby = () => {
    const seats = lobby.players;
    const full = seats.every(Boolean);
    const joinSeat = (idx) => {
      setLobby((l) => {
        if (l.players[idx]) return l;
        const copy = { ...l, players: [...l.players] };
        copy.players[idx] = SAMPLE_USERS[idx];
        toasts.push({ title: `${copy.players[idx].name} joined`, icon: "👋" });
        const isFull = copy.players.every(Boolean);
        if (isFull) {
          copy.state = "active";
          toasts.push({ title: "Bracket created", icon: "🧩" });
        }
        return copy;
      });
    };

    return (
      <div className="max-w-3xl mx-auto px-4 pt-10 pb-24 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-xl font-semibold">
            Lobby <span className="opacity-70">{lobby.id}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={lobby.state === "waiting" ? "info" : "success"}>
              {lobby.state}
            </Badge>
            <IntegrationTag label="lobby:subscribe" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {seats.map((p, i) => (
            <Card key={i}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm opacity-70">Seat {i + 1}</div>
                  <div className="text-lg">{p ? p.name : "Empty"}</div>
                  <div className="text-xs opacity-70">
                    {p ? `Rating ${p.rating}` : "Waiting…"}
                  </div>
                </div>
                {!p ? (
                  <Button onClick={() => joinSeat(i)}>Join</Button>
                ) : (
                  <Badge tone="success">Joined</Badge>
                )}
              </div>
            </Card>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() =>
              toasts.push({ title: "Connecting to server…", icon: "🌐" })
            }
          >
            Reconnect
          </Button>
          <Button
            variant="ghost"
            onClick={() =>
              toasts.push({ title: "Lobby not available", icon: "⚠️" })
            }
          >
            Simulate Error
          </Button>
          {full && (
            <>
              <Button onClick={() => setRoute("deck")} className="ml-2">
                Start Bracket
              </Button>
              <IntegrationTag label="lobby:started" />
            </>
          )}
        </div>
      </div>
    );
  };

  const Deck = () => {
    const opponent = SAMPLE_USERS[2];
    const [rows, setRows] = useState(DEFAULT_DECK);
    const [errors, setErrors] = useState(Array(5).fill(""));
    const valid =
      rows.length === 5 &&
      rows.every((r) => validateTrackUrl(r.url)) &&
      new Set(rows.map((r) => r.url)).size === 5;
    const anyDup = new Set(rows.map((r) => r.url)).size !== 5;

    const update = (i, patch) =>
      setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

    return (
      <div className="max-w-3xl mx-auto px-4 pt-10 pb-24 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm opacity-70">Opponent</div>
            <div className="text-lg font-semibold">
              {opponent.name}{" "}
              <span className="opacity-60 text-sm">({opponent.rating})</span>
            </div>
          </div>
          <Badge tone="info">Deck submission</Badge>
        </div>
        <Card>
          <div className="mb-3 text-sm opacity-80">
            Paste <b>YouTube</b> or <b>Spotify</b> track URLs in all 5 rows. No
            duplicates. Or use Sample Deck.
          </div>
          <div className="space-y-3">
            {rows.map((r, i) => (
              <div key={i} className="grid grid-cols-12 gap-3 items-start">
                <div className="col-span-8">
                  <Input
                    label={`Track ${i + 1} – URL`}
                    value={r.url}
                    onChange={(v) => {
                      update(i, { url: v });
                      const ok = validateTrackUrl(v);
                      setErrors((es) =>
                        es.map((e, idx) =>
                          idx === i ? (!ok ? "Invalid track URL" : "") : e
                        )
                      );
                    }}
                    error={errors[i]}
                    helper={
                      !errors[i]
                        ? "youtube.com / youtu.be / open.spotify.com"
                        : ""
                    }
                    placeholder="https://www.youtube.com/watch?v=… or https://open.spotify.com/track/…"
                  />
                </div>
                <div className="col-span-4">
                  <Input
                    label="Hook start (sec)"
                    type="number"
                    value={r.hook_start_sec}
                    onChange={(v) =>
                      update(i, { hook_start_sec: Number(v || 0) })
                    }
                    helper="Optional"
                  />
                </div>
              </div>
            ))}
            {anyDup && (
              <div className="text-xs" style={{ color: TOKENS.colors.error }}>
                Duplicate URLs are not allowed.
              </div>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="secondary" onClick={() => setRows(DEFAULT_DECK)}>
                Use Sample Deck
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setRows(
                    Array(5).fill({
                      title: "",
                      artist: "",
                      source: "youtube",
                      url: "",
                      hook_start_sec: 0,
                    })
                  );
                }}
              >
                Clear All
              </Button>
              <div className="flex items-center gap-2 ml-auto">
                <Button
                  disabled={!valid}
                  onClick={() => {
                    toasts.push({
                      title: "Deck submitted! Waiting for opponent…",
                      icon: "✅",
                    });
                    setTimeout(() => {
                      startMatch();
                    }, 800);
                  }}
                >
                  Submit Deck
                </Button>
                <IntegrationTag label="deck:submit" />
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  // Match Simulation ---------------------------------------------------------
  const [mState, setMState] = useState({
    round: 1,
    bestOf: 3,
    phase: "pending",
    scoreA: 0,
    scoreB: 0,
    votesA: 0,
    votesB: 0,
    history: [],
  });
  const votingOpenRef = useRef(false);
  const votedRef = useRef(false);

  const startMatch = () => {
    const m = {
      id: "m1",
      round_of: 4,
      player_a: SAMPLE_USERS[0],
      player_b: SAMPLE_USERS[1],
      state: "ready",
      deck_a: DEFAULT_DECK,
      deck_b: DEFAULT_DECK.slice().reverse(),
    };
    setMatch(m);
    setRoute("match");
    toasts.push({ title: "Match starting…", icon: "🥊" });
    setMState({
      round: 1,
      bestOf: 3,
      phase: "playingA",
      scoreA: 0,
      scoreB: 0,
      votesA: 0,
      votesB: 0,
      history: [],
    });
  };

  useEffect(() => {
    const onKey = (e) => {
      if (!votingOpenRef.current) return;
      if (e.key.toLowerCase() === "a") vote("A");
      if (e.key.toLowerCase() === "b") vote("B");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const nextPhase = () => {
    setMState((s) => {
      let phase = s.phase;
      if (phase === "playingA") phase = "playingB";
      else if (phase === "playingB") phase = "voting";
      else if (phase === "voting") phase = "results";
      else if (phase === "results") {
        const need = Math.ceil(s.bestOf / 2);
        if (s.scoreA >= need || s.scoreB >= need) phase = "complete";
        else phase = "playingA";
      }
      return { ...s, phase };
    });
  };
  const startVoting = () => {
    votingOpenRef.current = true;
    votedRef.current = false;
  };
  const closeVoting = () => {
    votingOpenRef.current = false;
  };

  const vote = (side) => {
    if (!votingOpenRef.current) {
      toasts.push({ title: "Voting not open", icon: "⚠️" });
      return;
    }
    if (votedRef.current) {
      toasts.push({ title: "Vote already submitted", icon: "⚠️" });
      return;
    }
    votedRef.current = true;
    setMState((s) => ({
      ...s,
      votesA: s.votesA + (side === "A" ? 1 : 0),
      votesB: s.votesB + (side === "B" ? 1 : 0),
    }));
    toasts.push({ title: `Voted ${side}`, icon: "🗳️" });
  };

  const finalizeRound = () => {
    setMState((s) => {
      let winner;
      if (s.votesA > s.votesB) winner = "A";
      else if (s.votesB > s.votesA) winner = "B";
      else winner = "TIE";
      let scoreA = s.scoreA + (winner === "A" ? 1 : 0);
      let scoreB = s.scoreB + (winner === "B" ? 1 : 0);
      const history = [
        ...s.history,
        { round: s.round, votesA: s.votesA, votesB: s.votesB, winner },
      ];
      let round = s.round + 1;
      let phase = "results";
      const need = Math.ceil(s.bestOf / 2);
      if (scoreA >= need || scoreB >= need) {
        phase = "complete";
      } else {
        phase = "playingA";
      }
      return {
        ...s,
        history,
        scoreA,
        scoreB,
        round,
        votesA: 0,
        votesB: 0,
        phase,
      };
    });
  };

  const MatchView = () => {
    const s = mState;
    const m = match;
    const [runA, setRunA] = useState(s.phase === "playingA");
    const [runB, setRunB] = useState(s.phase === "playingB");
    const [runV, setRunV] = useState(s.phase === "voting");
    useEffect(() => {
      setRunA(s.phase === "playingA");
      setRunB(s.phase === "playingB");
      setRunV(s.phase === "voting");
      if (s.phase === "voting") startVoting();
      else closeVoting();
    }, [s.phase]);

    return (
      <div className="max-w-5xl mx-auto px-4 pt-8 pb-28">
        <div className="flex items-center justify-between mb-4">
          <div className="text-lg font-semibold">
            {m.player_a.name} vs {m.player_b.name}
          </div>
          <div className="flex items-center gap-2">
            <Badge tone="neutral">Best of {s.bestOf}</Badge>
            <Badge tone="info">Round {Math.min(s.round, s.bestOf)}</Badge>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <TrackPanel
            who="A"
            deck={m.deck_a}
            round={s.round}
            active={s.phase === "playingA"}
            votes={s.votesA}
          />
          <TrackPanel
            who="B"
            deck={m.deck_b}
            round={s.round}
            active={s.phase === "playingB"}
            votes={s.votesB}
          />
        </div>
        <div className="mt-4 grid md:grid-cols-3 gap-4">
          <Card>
            <Timer
              seconds={20}
              running={runA}
              onDone={() => setMState((x) => ({ ...x, phase: "playingB" }))}
              label="Playing A"
            />
          </Card>
          <Card>
            <Timer
              seconds={20}
              running={runB}
              onDone={() => setMState((x) => ({ ...x, phase: "voting" }))}
              label="Playing B"
            />
          </Card>
          <Card>
            <Timer
              seconds={5}
              running={runV}
              onDone={() => setMState((x) => ({ ...x, phase: "results" }))}
              label="Voting"
            />
            <div className="text-xs mt-2 opacity-80">
              Press <b>A</b> or <b>B</b> to vote
            </div>
          </Card>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button variant="secondary" onClick={nextPhase}>
            Advance Phase
          </Button>
          <Button variant="secondary" onClick={() => vote("A")}>
            Vote A
          </Button>
          <Button variant="secondary" onClick={() => vote("B")}>
            Vote B
          </Button>
          <IntegrationTag label="round:start / round:voting / vote:submit" />
        </div>
        <div className="mt-6 grid grid-cols-3 gap-4">
          <Card>
            <div className="text-sm opacity-70 mb-2">Score</div>
            <div className="text-2xl">
              {s.scoreA} – {s.scoreB}
            </div>
          </Card>
          <Card>
            <div className="text-sm opacity-70 mb-2">Current Votes</div>
            <div className="text-2xl">
              A {s.votesA} / B {s.votesB}
            </div>
          </Card>
          <Card>
            <div className="text-sm opacity-70 mb-2">Round History</div>
            <div className="space-y-1 text-sm">
              {s.history.map((h, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span>R{i + 1}</span>
                  <span>
                    A {h.votesA} / B {h.votesB}
                  </span>
                  <span>{h.winner}</span>
                </div>
              ))}
              {s.history.length === 0 && (
                <div className="opacity-60">No rounds yet.</div>
              )}
            </div>
          </Card>
        </div>
        {s.phase === "results" && (
          <div className="mt-6">
            <Card>
              <div className="text-lg font-semibold mb-2">Round result</div>
              <div className="flex items-center gap-3">
                <Badge
                  tone={
                    mState.votesA > mState.votesB
                      ? "success"
                      : mState.votesA === mState.votesB
                      ? "warning"
                      : "neutral"
                  }
                >
                  A: {mState.votesA}
                </Badge>
                <Badge
                  tone={
                    mState.votesB > mState.votesA
                      ? "success"
                      : mState.votesA === mState.votesB
                      ? "warning"
                      : "neutral"
                  }
                >
                  B: {mState.votesB}
                </Badge>
                <Button onClick={finalizeRound}>Next Round</Button>
                <IntegrationTag label="round:complete" />
              </div>
            </Card>
          </div>
        )}
        {s.phase === "complete" && (
          <div className="mt-8">
            <Card>
              <div className="text-2xl font-semibold mb-2">Match Complete</div>
              <div className="mb-2">
                Winner:{" "}
                {mState.scoreA > mState.scoreB
                  ? m.player_a.name
                  : m.player_b.name}
              </div>
              <div className="mb-4 text-sm opacity-80">
                Elo Δ +12 / −8 (K=40 provisional &lt; 10 matches)
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setRoute("home")}>Back to Home</Button>
                <Button variant="secondary" onClick={() => setRoute("profile")}>
                  View Profile
                </Button>
                <Button variant="ghost" onClick={() => setRoute("leaderboard")}>
                  Leaderboard
                </Button>
                <IntegrationTag label="match:complete / rating:update" />
              </div>
            </Card>
          </div>
        )}
        {mState.phase === "voting" && (
          <div
            className="fixed inset-0 flex items-center justify-center"
            style={{ background: TOKENS.colors.overlay }}
          >
            <Card className="max-w-md w-[90%] text-center">
              <div className="text-xl font-semibold mb-2">Vote Now!</div>
              <div className="opacity-80 mb-4">
                5 seconds • Press <b>A</b> or <b>B</b>
              </div>
              <div className="flex items-center justify-center gap-3">
                <Button onClick={() => vote("A")}>Vote A</Button>
                <Button variant="secondary" onClick={() => vote("B")}>
                  Vote B
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    );
  };

  /* ---------- PATCHED TrackPanel uses safeYouTubeId ---------- */
  function TrackPanel({ who, deck, round, active, votes }) {
    const idx = Math.min(round - 1, deck.length - 1);
    const t = deck[idx];
    const ytId = t.source === "youtube" ? safeYouTubeId(t.url, YT[idx]) : null;
    const thumb = ytId ? ytThumb(ytId) : undefined;

    return (
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm opacity-70">Player {who}</div>
          <Badge tone={active ? "info" : "neutral"}>
            {active ? "Playing" : "Standby"}
          </Badge>
        </div>
        <div className="flex gap-4 items-center">
          <div className="w-28 h-16 rounded-lg overflow-hidden bg-black flex-shrink-0">
            {thumb ? (
              <img
                src={thumb}
                alt="thumb"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                🎧
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="truncate font-medium">
              {t.title || `Track ${idx + 1}`}
            </div>
            <div className="text-sm opacity-70 truncate">
              {t.artist || "Artist"}
            </div>
            <div className="text-xs opacity-70 mt-1">
              {t.source} • hook @{t.hook_start_sec || 0}s
            </div>
          </div>
          <div className="text-sm opacity-80">Votes: {votes}</div>
        </div>
      </Card>
    );
  }

  const Results = () => (
    <div className="max-w-3xl mx-auto px-4 pt-12 pb-24">
      <Card>
        <div className="text-2xl font-semibold mb-2">
          Winner: Test User 1 🎉
        </div>
        <div className="text-sm opacity-80 mb-4">Elo change +12 / −8</div>
        <div className="flex gap-2">
          <Button onClick={() => setRoute("home")}>Back to Home</Button>
          <Button variant="secondary" onClick={() => setRoute("profile")}>
            View Profile
          </Button>
        </div>
      </Card>
    </div>
  );

  const Profile = () => (
    <div className="max-w-3xl mx-auto px-4 pt-10 pb-24 space-y-4">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm opacity-70">Rating</div>
            <div className="text-3xl font-semibold">
              {user.rating}{" "}
              <span className="text-sm opacity-60">
                ({user.provisional_count}/10)
              </span>
            </div>
          </div>
          <Badge tone="warning">Provisional</Badge>
        </div>
      </Card>
      <Card>
        <div className="text-lg font-semibold mb-2">Recent Matches</div>
        <div className="space-y-2 text-sm">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between border rounded-xl p-3"
              style={{
                borderColor: TOKENS.colors.border,
                background: "#0F1623",
              }}
            >
              <span>
                vs Test User {i + 1} • 2025-08-0{i} • Win
              </span>
              <span className="opacity-80">+12</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <Button onClick={() => setRoute("lobby")}>Find New Match</Button>
          <Button
            variant="secondary"
            onClick={() => toasts.push({ title: "Name updated", icon: "✏️" })}
          >
            Edit Name
          </Button>
        </div>
      </Card>
    </div>
  );

  const Leaderboard = () => (
    <div className="max-w-3xl mx-auto px-4 pt-10 pb-24 space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xl font-semibold">Leaderboard</div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => toasts.push({ title: "Global", icon: "🌍" })}
          >
            Global
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => toasts.push({ title: "Weekly", icon: "📅" })}
          >
            Weekly
          </Button>
        </div>
      </div>
      <Card>
        <div className="grid grid-cols-6 text-xs opacity-70 mb-2">
          <div className="col-span-1">Rank</div>
          <div className="col-span-3">Name</div>
          <div className="col-span-2">Rating</div>
        </div>
        <div className="space-y-1">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-6 items-center text-sm rounded-lg p-2"
              style={{ background: i % 2 ? "#0F1623" : "#131B2A" }}
            >
              <div className="col-span-1">{i + 1}</div>
              <div className="col-span-3 flex items-center gap-2">
                {i < 3 ? "🏆" : ""} Player {i + 1}{" "}
                {i < 10 && (
                  <Badge tone="warning" className="ml-2">
                    Provisional
                  </Badge>
                )}
              </div>
              <div className="col-span-2">{1400 - i * 5}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  const ComponentsGallery = () => (
    <div className="max-w-5xl mx-auto px-4 pt-10 pb-24 space-y-6">
      <div className="text-xl font-semibold">Components</div>
      <Card>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="font-medium">Buttons</div>
            <div className="flex flex-wrap gap-2">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
              <Button disabled>Disabled</Button>
            </div>
          </div>
          <div className="space-y-2">
            <div className="font-medium">Inputs</div>
            <Input label="Label" placeholder="Type…" helper="Helper text" />
            <Input
              label="With error"
              placeholder="Type…"
              error="Invalid value"
            />
          </div>
          <div className="space-y-2">
            <div className="font-medium">Badges</div>
            <div className="flex gap-2 items-center">
              <Badge tone="info">Info</Badge>
              <Badge tone="success">Winner</Badge>
              <Badge tone="warning">Provisional</Badge>
              <Badge tone="error">Error</Badge>
            </div>
          </div>
          <div className="space-y-2">
            <div className="font-medium">Toast</div>
            <Button
              variant="secondary"
              onClick={() =>
                toasts.push({ title: "Example toast", icon: "🔔" })
              }
            >
              Show Toast
            </Button>
          </div>
          <div className="space-y-2 md:col-span-2">
            <div className="font-medium">Timer</div>
            <Timer seconds={7} running onDone={() => {}} label="Demo" />
          </div>
        </div>
      </Card>
    </div>
  );

  const Notes = () => (
    <div className="max-w-4xl mx-auto px-4 pt-10 pb-24 space-y-4">
      <Card>
        <div className="text-xl font-semibold mb-2">Handoff Notes</div>
        <ul className="text-sm list-disc pl-5 space-y-1 opacity-90">
          <li>
            Real-time via <b>Socket.IO</b> on Node server (not serverless).
          </li>
          <li>
            Client events: <code>lobby:create</code>, <code>lobby:join</code>,{" "}
            <code>lobby:started</code>, <code>deck:submit</code>,{" "}
            <code>match:ready</code>, <code>round:start</code>,{" "}
            <code>round:voting</code>, <code>vote:submit</code>,{" "}
            <code>round:complete</code>, <code>match:complete</code>.
          </li>
          <li>
            MVP audio: YouTube embeds + simulated timers; Spotify Web Playback
            later.
          </li>
          <li>
            Elo: K=40 provisional (&lt;10), K=32 otherwise. Show deltas on
            results and profile.
          </li>
          <li>Integration tags in UI show where API hooks in.</li>
          <li>
            Playlists: reserved left nav slot & route for future management.
          </li>
        </ul>
      </Card>
      <Card>
        <div className="text-lg font-semibold mb-2">Navigation Map</div>
        <div className="text-sm opacity-90">
          Home → (Sign In or Guest) → Find Match → Lobby (players join until 4)
          →<b> Start Bracket</b> → Deck Submission → Match View (R1/R2/R3,
          tiebreakers) → Match Complete → Back Home / Profile → Leaderboard.
        </div>
      </Card>
      <Card>
        <div className="text-lg font-semibold mb-2">Design Tokens</div>
        <pre
          className="text-xs overflow-auto"
          style={{
            background: "#0B1220",
            padding: 12,
            borderRadius: 12,
            border: `1px solid ${TOKENS.colors.border}`,
          }}
        >
          {JSON.stringify(TOKENS, null, 2)}
        </pre>
      </Card>
      <Card>
        <div className="text-lg font-semibold mb-2">Open Questions</div>
        <ul className="text-sm list-disc pl-5 space-y-1 opacity-90">
          <li>Spectator voting?</li>
          <li>Tiebreakers after 5 tracks?</li>
          <li>Username policy & profanity filter?</li>
          <li>Do guests play ranked?</li>
        </ul>
      </Card>
    </div>
  );

  const DebugPanel = () => {
    const [open, setOpen] = useState(true);
    if (route !== "match") return null;
    return (
      <div className="fixed right-4 bottom-4 z-40">
        <div className="mb-2 flex justify-end">
          <button
            onClick={() => setOpen((o) => !o)}
            className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
            style={{
              background: TOKENS.colors.primary,
              boxShadow: TOKENS.shadow.lift,
            }}
          >
            ⚙️
          </button>
        </div>
        {open && (
          <Card className="w-80">
            <div className="text-sm font-semibold mb-2">Debug</div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setMState((s) => ({ ...s, phase: "playingA" }))}
              >
                Playing A
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setMState((s) => ({ ...s, phase: "playingB" }))}
              >
                Playing B
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setMState((s) => ({ ...s, phase: "voting" }))}
              >
                Voting
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setMState((s) => ({ ...s, phase: "results" }))}
              >
                Results
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <Button size="sm" onClick={() => vote("A")}>
                +A
              </Button>
              <Button size="sm" onClick={() => vote("B")}>
                +B
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() =>
                  setMState((s) => ({ ...s, votesA: 0, votesB: 0 }))
                }
              >
                Clear
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" onClick={finalizeRound}>
                Next Round
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setMState((s) => ({ ...s, phase: "complete" }))}
              >
                Complete
              </Button>
            </div>
          </Card>
        )}
      </div>
    );
  };

  const Footer = () => (
    <div
      className="fixed inset-x-0 bottom-0 z-20"
      style={{
        background:
          "linear-gradient(0deg, rgba(17,24,39,0.95), rgba(17,24,39,0.7))",
        borderTop: `1px solid ${TOKENS.colors.border}`,
      }}
    >
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setRoute("components")}
          >
            Components
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setRoute("notes")}>
            Handoff Notes
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              toasts.push({
                title: "Network: Connecting to server…",
                icon: "🌐",
              })
            }
          >
            Simulate Network
          </Button>
        </div>
        <div className="opacity-70">© 2025 Taste Battles</div>
      </div>
    </div>
  );

  const ToastViewport = () => (
    <div className="fixed right-4 top-4 z-50 space-y-2">
      {toasts.toasts.map((t) => (
        <Toast key={t.id} toast={t} onClose={() => toasts.remove(t.id)} />
      ))}
    </div>
  );

  return (
    <div>
      <Header />
      {route === "home" && <Home />}
      {route === "auth" && <Auth />}
      {route === "lobby" && <Lobby />}
      {route === "deck" && <Deck />}
      {route === "match" && <MatchView />}
      {route === "results" && <Results />}
      {route === "profile" && <Profile />}
      {route === "leaderboard" && <Leaderboard />}
      {route === "components" && <ComponentsGallery />}
      {route === "notes" && <Notes />}
      <ToastViewport />
      <Footer />
      <DebugPanel />
    </div>
  );
}
