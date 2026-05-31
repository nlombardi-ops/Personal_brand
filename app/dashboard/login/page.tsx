"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, ArrowRight, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push("/dashboard");
    } else {
      setError("Contraseña incorrecta");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-800">
            <Lock className="h-5 w-5 text-neutral-400" />
          </div>
          <h1 className="text-lg font-semibold text-white">Finance Dashboard</h1>
          <p className="mt-1 text-sm text-neutral-500">Enter password to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoFocus
              className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white placeholder-neutral-600 outline-none transition focus:border-neutral-600 focus:ring-1 focus:ring-neutral-600"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-neutral-200 disabled:opacity-50"
          >
            {loading ? "Checking..." : "Continue"}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
