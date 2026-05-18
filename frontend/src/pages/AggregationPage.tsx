import { Link } from "react-router-dom";

export function AggregationPage() {
  return (
    <main className="min-h-screen flex flex-col px-6 pt-16 pb-8">
      <header className="mb-8">
        <Link to="/" className="text-sm text-slate-300 underline underline-offset-4">
          ← Back to swiping
        </Link>
      </header>
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <h1 className="text-3xl font-bold mb-2">Results</h1>
        <p className="text-slate-400">Aggregation lives here.</p>
        <p className="text-slate-600 text-xs mt-6">
          Coming next: sortable, searchable list of every pet and how everyone voted.
        </p>
      </div>
    </main>
  );
}
