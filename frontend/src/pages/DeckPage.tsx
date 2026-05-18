import { useAuth } from "../auth/useAuth";

export function DeckPage() {
  const { user, logout } = useAuth();

  return (
    <main className="min-h-screen flex flex-col px-6 pt-16 pb-8">
      <header className="flex items-center justify-between mb-12">
        <div>
          <p className="text-slate-400 text-sm">Signed in as</p>
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

      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <h1 className="text-3xl font-bold mb-2">Swipe</h1>
        <p className="text-slate-400">The pet deck lives here.</p>
        <p className="text-slate-600 text-xs mt-6">Coming next: swipe gestures + voting.</p>
      </div>
    </main>
  );
}
