import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { ApiError } from "../lib/api";
import { useAuth } from "./useAuth";

type LocationState = { from?: string };

export function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as LocationState | null)?.from ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user !== null) {
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col px-6 pt-16 pb-8">
      <h1 className="text-3xl font-bold mb-2">Welcome back</h1>
      <p className="text-slate-400 mb-8">Sign in to keep voting.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-slate-300">Email</span>
          <input
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl bg-slate-900 border border-slate-800 px-4 py-3 focus:outline-none focus:border-slate-600"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-slate-300">Password</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-xl bg-slate-900 border border-slate-800 px-4 py-3 focus:outline-none focus:border-slate-600"
          />
        </label>

        {error !== null && (
          <p role="alert" className="text-red-400 text-sm">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-xl bg-yes text-slate-950 font-semibold py-3 active:scale-[0.98] transition-transform disabled:opacity-50 disabled:active:scale-100"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-8 text-slate-400 text-sm">
        New here?{" "}
        <Link to="/signup" className="text-slate-100 underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </main>
  );
}
