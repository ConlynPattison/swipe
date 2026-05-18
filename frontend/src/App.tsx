import { useEffect, useState } from "react";

type HealthResponse = { status: string };

export default function App() {
  const [apiStatus, setApiStatus] = useState<string>("checking…");

  useEffect(() => {
    fetch("/api/health")
      .then((res) => (res.ok ? (res.json() as Promise<HealthResponse>) : Promise.reject(res.status)))
      .then((data) => setApiStatus(data.status))
      .catch((err) => setApiStatus(`error: ${err}`));
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-4xl font-bold mb-2">Swipe</h1>
      <p className="text-slate-400 mb-8">Swipe-to-vote on adoptable pets.</p>
      <div className="rounded-xl bg-slate-900 px-4 py-3 text-sm">
        backend <span className="font-mono">/api/health</span>: <span className="font-mono">{apiStatus}</span>
      </div>
    </main>
  );
}
