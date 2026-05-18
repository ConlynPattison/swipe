import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../auth/useAuth";
import { SwipeCard, type SwipeDirection } from "../deck/SwipeCard";
import { api, ApiError, type Pet, type VoteChoice, type VoteResponse } from "../lib/api";

type DeckState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; pets: Pet[]; index: number };

export function DeckPage() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<DeckState>({ kind: "loading" });

  useEffect(() => {
    if (token === null) return;
    let cancelled = false;
    setState({ kind: "loading" });
    api
      .get<Pet[]>("/pets", token)
      .then((allPets) => {
        if (cancelled) return;
        const unvoted = allPets.filter((p) => p.your_vote === null);
        setState({ kind: "ready", pets: unvoted, index: 0 });
      })
      .catch((err) => {
        if (cancelled) return;
        const msg = err instanceof ApiError ? err.detail : "Couldn't load pets.";
        setState({ kind: "error", message: msg });
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const goToResults = useCallback(() => {
    navigate("/results");
  }, [navigate]);

  const recordVote = useCallback(
    (pet: Pet, choice: VoteChoice) => {
      api.put<VoteResponse>(`/votes/${pet.id}`, { choice }, token).catch((err) => {
        console.error(`Vote on pet ${pet.id} failed:`, err);
      });
    },
    [token],
  );

  const handleCommit = useCallback(
    (direction: SwipeDirection) => {
      if (state.kind !== "ready") return;
      const current = state.pets[state.index];
      if (current === undefined) {
        if (direction === "agg") goToResults();
        return;
      }
      if (direction === "agg") {
        goToResults();
        return;
      }
      recordVote(current, direction);
      setState({ kind: "ready", pets: state.pets, index: state.index + 1 });
    },
    [state, goToResults, recordVote],
  );

  const atEnd = state.kind === "ready" && state.index >= state.pets.length;

  return (
    <main className="min-h-screen flex flex-col px-6 pt-12 pb-6">
      <header className="flex items-center justify-between mb-6">
        <div>
          <p className="text-slate-500 text-xs uppercase tracking-wider">Signed in as</p>
          <p className="font-semibold">{user?.username}</p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="text-sm text-slate-300 underline underline-offset-4"
        >
          Sign out
        </button>
      </header>

      <DeckBody state={state} onCommit={handleCommit} onViewResults={goToResults} />

      <BottomNav
        disabled={state.kind !== "ready" || atEnd}
        onNo={() => handleCommit("no")}
        onYes={() => handleCommit("yes")}
        onAggregation={goToResults}
      />
    </main>
  );
}

const CARD_CLS =
  "relative w-full max-w-[340px] aspect-[3/4] mx-auto my-6 flex items-center justify-center";

function DeckBody({
  state,
  onCommit,
  onViewResults,
}: {
  state: DeckState;
  onCommit: (d: SwipeDirection) => void;
  onViewResults: () => void;
}) {
  if (state.kind === "loading") {
    return (
      <div className={CARD_CLS}>
        <p className="text-slate-500">Loading pets…</p>
      </div>
    );
  }
  if (state.kind === "error") {
    return (
      <div className={CARD_CLS}>
        <p className="text-red-400 text-center">{state.message}</p>
      </div>
    );
  }

  const current = state.pets[state.index];
  const next = state.pets[state.index + 1];
  const atEnd = current === undefined;

  return (
    <div className="flex-1 flex flex-col items-center justify-center">
      <div className={CARD_CLS}>
        {atEnd ? (
          <EndOfDeckCard onViewResults={onViewResults} onCommit={onCommit} />
        ) : (
          <>
            {next !== undefined && <NextCardPreview pet={next} />}
            <SwipeCard key={current.id} onCommit={onCommit}>
              <PetVisual pet={current} />
            </SwipeCard>
          </>
        )}
      </div>
      <p className="text-slate-600 text-xs mt-2">
        Swipe right to adopt · left to skip · down for results
      </p>
    </div>
  );
}

function PetVisual({ pet }: { pet: Pet }) {
  return (
    <div className="absolute inset-0 bg-slate-900 shadow-2xl shadow-black/40">
      <img
        src={pet.image_url}
        alt={pet.label}
        draggable={false}
        loading="eager"
        className="w-full h-full object-cover pointer-events-none"
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-5 pb-5 pt-12">
        <p className="text-xl font-semibold">{pet.label}</p>
      </div>
    </div>
  );
}

function NextCardPreview({ pet }: { pet: Pet }) {
  return (
    <div className="absolute inset-0 rounded-3xl overflow-hidden bg-slate-900 scale-[0.94] opacity-70 pointer-events-none">
      <img
        src={pet.image_url}
        alt=""
        loading="eager"
        className="w-full h-full object-cover"
      />
    </div>
  );
}

function EndOfDeckCard({
  onViewResults,
  onCommit,
}: {
  onViewResults: () => void;
  onCommit: (d: SwipeDirection) => void;
}) {
  return (
    <SwipeCard onCommit={onCommit} allowHorizontal={false}>
      <div className="absolute inset-0 bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-center px-6">
        <p className="text-2xl font-bold mb-2 leading-snug">
          You've voted on all of the pets&nbsp;—&nbsp;see how others voted!
        </p>
        <button
          type="button"
          onClick={onViewResults}
          className="mt-6 rounded-xl bg-yes text-slate-950 font-semibold py-3 px-6 active:scale-[0.98] transition-transform"
        >
          View results
        </button>
      </div>
    </SwipeCard>
  );
}

function BottomNav({
  disabled,
  onNo,
  onYes,
  onAggregation,
}: {
  disabled: boolean;
  onNo: () => void;
  onYes: () => void;
  onAggregation: () => void;
}) {
  return (
    <nav className="flex items-center justify-center gap-6 pt-4 pb-2">
      <NavButton
        label="Not interested"
        symbol="✕"
        tone="no"
        onClick={onNo}
        disabled={disabled}
      />
      <NavButton
        label="Results"
        symbol="▾"
        tone="agg"
        onClick={onAggregation}
        disabled={false}
      />
      <NavButton
        label="Adopt"
        symbol="♥"
        tone="yes"
        onClick={onYes}
        disabled={disabled}
      />
    </nav>
  );
}

function NavButton({
  label,
  symbol,
  tone,
  onClick,
  disabled,
}: {
  label: string;
  symbol: string;
  tone: "no" | "agg" | "yes";
  onClick: () => void;
  disabled: boolean;
}) {
  const toneCls =
    tone === "yes"
      ? "border-yes/60 text-yes"
      : tone === "no"
        ? "border-no/60 text-no"
        : "border-sky-500/60 text-sky-400";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`w-16 h-16 rounded-full border-2 ${toneCls} flex items-center justify-center text-2xl bg-slate-900 active:scale-95 transition-transform disabled:opacity-30 disabled:active:scale-100`}
    >
      {symbol}
    </button>
  );
}
