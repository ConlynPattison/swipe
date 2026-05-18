import { useMemo, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { ApiError, type FieldError } from "../lib/api";
import { useAuth } from "./useAuth";

type PasswordChecks = {
  length: boolean;
  upper: boolean;
  lower: boolean;
  digit: boolean;
};

function checkPassword(pw: string): PasswordChecks {
  return {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    digit: /[0-9]/.test(pw),
  };
}

function passwordIsStrong(checks: PasswordChecks): boolean {
  return checks.length && checks.upper && checks.lower && checks.digit;
}

function errorFor(field: string, fieldErrors: FieldError[]): string | null {
  const match = fieldErrors.find((e) => e.field === field);
  return match ? match.message : null;
}

export function SignupPage() {
  const { signup, user } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldError[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const checks = useMemo(() => checkPassword(password), [password]);
  const canSubmit = username.length >= 3 && email.length > 0 && passwordIsStrong(checks);

  if (user !== null) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors([]);
    setSubmitting(true);
    try {
      await signup(username, email, password);
      navigate("/", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail);
        setFieldErrors(err.fieldErrors);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const usernameError = errorFor("username", fieldErrors);
  const emailError = errorFor("email", fieldErrors);
  const passwordError = errorFor("password", fieldErrors);

  return (
    <main className="min-h-screen flex flex-col px-6 pt-16 pb-8">
      <h1 className="text-3xl font-bold mb-2">Create account</h1>
      <p className="text-slate-400 mb-8">Start voting on adoptable pets.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-slate-300">Username</span>
          <input
            type="text"
            autoComplete="username"
            required
            minLength={3}
            maxLength={30}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="rounded-xl bg-slate-900 border border-slate-800 px-4 py-3 focus:outline-none focus:border-slate-600"
          />
          {usernameError !== null && (
            <span className="text-red-400 text-xs">{usernameError}</span>
          )}
        </label>

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
          {emailError !== null && <span className="text-red-400 text-xs">{emailError}</span>}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-slate-300">Password</span>
          <input
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-xl bg-slate-900 border border-slate-800 px-4 py-3 focus:outline-none focus:border-slate-600"
          />
          <ul className="text-xs text-slate-400 mt-1 space-y-0.5" aria-live="polite">
            <Rule ok={checks.length}>at least 8 characters</Rule>
            <Rule ok={checks.upper}>one uppercase letter</Rule>
            <Rule ok={checks.lower}>one lowercase letter</Rule>
            <Rule ok={checks.digit}>one digit</Rule>
          </ul>
          {passwordError !== null && (
            <span className="text-red-400 text-xs">{passwordError}</span>
          )}
        </label>

        {error !== null && fieldErrors.length === 0 && (
          <p role="alert" className="text-red-400 text-sm">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || !canSubmit}
          className="mt-2 rounded-xl bg-yes text-slate-950 font-semibold py-3 active:scale-[0.98] transition-transform disabled:opacity-50 disabled:active:scale-100"
        >
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-8 text-slate-400 text-sm">
        Already have an account?{" "}
        <Link to="/login" className="text-slate-100 underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </main>
  );
}

function Rule({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className={ok ? "text-yes" : "text-slate-500"}>
      <span aria-hidden="true">{ok ? "✓" : "·"}</span> {children}
    </li>
  );
}
