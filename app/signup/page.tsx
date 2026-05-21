"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { OAuthButtons } from "@/app/components/OAuthButtons";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Something went wrong");
      setLoading(false);
      return;
    }
    await signIn("credentials", { email, password, callbackUrl: "/" });
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 mb-4">
            <span className="text-2xl">🏀</span>
          </div>
          <h1 className="text-xl font-bold text-white">Create account</h1>
          <p className="text-zinc-500 text-sm mt-1">Start trading on NBAStocks</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800/60 rounded-2xl p-6 space-y-5">
          <OAuthButtons action="signup" />

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-zinc-600 text-xs">or continue with email</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
              />
            </div>
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
                minLength={8}
                placeholder="Min. 8 characters"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
              />
            </div>

            {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>
        </div>

        <p className="text-center text-zinc-600 text-sm mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-zinc-400 hover:text-white transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
