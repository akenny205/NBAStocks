"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { OAuthButtons } from "@/app/components/OAuthButtons";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (result?.error) {
      setError("Invalid email or password");
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 mb-4">
            <span className="text-2xl">🏀</span>
          </div>
          <h1 className="text-xl font-bold text-white">Welcome back</h1>
          <p className="text-zinc-500 text-sm mt-1">Sign in to NBAStocks</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800/60 rounded-2xl p-6 space-y-5">
          <OAuthButtons action="login" />

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-zinc-600 text-xs">or continue with email</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
              />
            </div>

            {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-center text-zinc-600 text-sm mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-zinc-400 hover:text-white transition-colors">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
