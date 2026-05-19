import { motion, useAnimation, type PanInfo } from "framer-motion";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/useAuth";
import { api, ApiError, type ResultRow, type SortOption } from "../lib/api";

// Handle drag commits with a smaller offset than the deck swipe because the
// handle's visible drag range is only ~50px; velocity threshold matches the
// deck so a deliberate flick still feels consistent.
const HANDLE_COMMIT_OFFSET = 40;
const HANDLE_COMMIT_VELOCITY = 600;
const HANDLE_DRAG_LIMIT = 50;
const EXIT_Y = 900;
const DEBOUNCE_MS = 250;

type FetchState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; results: ResultRow[] };

export function AggregationPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const pageControls = useAnimation();
  const [sort, setSort] = useState<SortOption>("most_loved");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [state, setState] = useState<FetchState>({ kind: "loading" });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (token === null) return;
    let cancelled = false;
    const params = new URLSearchParams({ sort });
    if (debouncedQuery) params.set("q", debouncedQuery);
    setState({ kind: "loading" });
    api
      .get<ResultRow[]>(`/results?${params.toString()}`, token)
      .then((rows) => {
        if (cancelled) return;
        setState({ kind: "ready", results: rows });
      })
      .catch((err) => {
        if (cancelled) return;
        const msg = err instanceof ApiError ? err.detail : "Couldn't load results.";
        setState({ kind: "error", message: msg });
      });
    return () => {
      cancelled = true;
    };
  }, [token, sort, debouncedQuery]);

  async function commitDismiss() {
    await pageControls.start({
      y: -EXIT_Y,
      opacity: 0,
      transition: { duration: 0.2 },
    });
    navigate("/");
  }

  return (
    <motion.main
      className="min-h-screen flex flex-col px-5 pt-3 pb-8"
      animate={pageControls}
    >
      <DragHandle onCommit={commitDismiss} />
      <header className="mb-4">
        <Link to="/" className="text-sm text-slate-300 underline underline-offset-4">
          ← Back to swiping
        </Link>
        <h1 className="text-2xl font-bold mt-3">Results</h1>
      </header>

      <Controls sort={sort} setSort={setSort} query={query} setQuery={setQuery} />

      <Body state={state} />
    </motion.main>
  );
}

function DragHandle({ onCommit }: { onCommit: () => void }) {
  const controls = useAnimation();

  async function onDragEnd(_: PointerEvent, info: PanInfo) {
    if (
      info.offset.y < -HANDLE_COMMIT_OFFSET ||
      info.velocity.y < -HANDLE_COMMIT_VELOCITY
    ) {
      onCommit();
      // No reset: the parent is animating away.
      return;
    }
    await controls.start({
      y: 0,
      transition: { type: "spring", stiffness: 400, damping: 30 },
    });
  }

  return (
    <div className="flex flex-col items-center pt-2 pb-3 select-none">
      <motion.div
        className="w-12 h-1.5 bg-slate-700 rounded-full cursor-grab active:cursor-grabbing"
        drag="y"
        dragConstraints={{ top: -HANDLE_DRAG_LIMIT, bottom: 0 }}
        dragElastic={0.6}
        dragMomentum={false}
        animate={controls}
        onDragEnd={onDragEnd}
        whileDrag={{ scale: 1.3, backgroundColor: "#94a3b8" }}
        aria-label="Drag up to return to the deck"
        role="button"
      />
      <p className="text-slate-600 text-[10px] mt-1.5 tracking-wide">
        drag ↑ to return
      </p>
    </div>
  );
}

function Controls({
  sort,
  setSort,
  query,
  setQuery,
}: {
  sort: SortOption;
  setSort: (s: SortOption) => void;
  query: string;
  setQuery: (q: string) => void;
}) {
  const options: { value: SortOption; label: string }[] = [
    { value: "most_loved", label: "Most loved" },
    { value: "most_divisive", label: "Most divisive" },
    { value: "most_skipped", label: "Most skipped" },
  ];
  return (
    <div className="flex flex-col gap-3 mb-4">
      <input
        type="search"
        placeholder="Search pets…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="rounded-xl bg-slate-900 border border-slate-800 px-4 py-2.5 text-sm focus:outline-none focus:border-slate-600"
      />
      <div className="grid grid-cols-3 gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setSort(opt.value)}
            className={`rounded-xl py-2 text-xs font-medium border transition-colors ${
              sort === opt.value
                ? "bg-slate-100 text-slate-950 border-slate-100"
                : "bg-slate-900 border-slate-800 text-slate-300"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Body({ state }: { state: FetchState }) {
  if (state.kind === "loading") {
    return <p className="text-slate-500 mt-6">Loading results…</p>;
  }
  if (state.kind === "error") {
    return <p className="text-red-400 mt-6">{state.message}</p>;
  }
  if (state.results.length === 0) {
    return <p className="text-slate-500 mt-6 text-center">No pets match.</p>;
  }
  return (
    <ul className="flex-1 divide-y divide-slate-800">
      {state.results.map((row) => (
        <ResultListItem key={row.id} row={row} />
      ))}
    </ul>
  );
}

function ResultListItem({ row }: { row: ResultRow }) {
  const hasVotes = row.total_votes > 0;
  const pct = hasVotes ? Math.round(row.yes_percent) : 0;
  return (
    <li className="flex gap-3 py-3 items-center">
      <img
        src={row.image_url}
        alt={row.label}
        loading="lazy"
        className="w-14 h-14 rounded-lg object-cover bg-slate-800 shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-semibold truncate">{row.label}</p>
          <p className="text-sm text-slate-300 tabular-nums shrink-0">
            {hasVotes ? `${pct}%` : "no votes"}
          </p>
        </div>
        <div className="mt-1.5 h-2 bg-slate-800 rounded-full overflow-hidden flex">
          {hasVotes && (
            <>
              <div className="h-full bg-yes" style={{ width: `${pct}%` }} />
              <div className="h-full bg-no" style={{ width: `${100 - pct}%` }} />
            </>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-1 tabular-nums">
          {row.yes_count} yes · {row.no_count} no · {row.total_votes} total
        </p>
      </div>
    </li>
  );
}
