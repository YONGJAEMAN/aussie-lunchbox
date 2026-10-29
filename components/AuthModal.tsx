"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage, emailRedirectTo, PASSWORD_MIN_LENGTH, PASSWORD_TOO_SHORT } from "@/lib/authErrors";

interface AuthModalProps {
  onClose: () => void;
}

export default function AuthModal({ onClose }: AuthModalProps) {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [error, setError] = useState("");
  // 🔴 성공 문구를 error에 담아 두어 "Check your email…"이 빨간 에러로 떴다.
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    try {
      if (tab === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onClose();
      } else {
        if (password !== confirmPwd) throw new Error("Passwords do not match");
        // 🔴 계정 페이지는 8자를 요구하는데 여기는 6자였다. 같은 계정인데 규칙이 둘이었다.
        if (password.length < PASSWORD_MIN_LENGTH) throw new Error(PASSWORD_TOO_SHORT);
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: emailRedirectTo() },
        });
        if (error) throw error;
        setNotice("Check your email to confirm your account.");
      }
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-[#314A37]">Join Kiwi Lunchbox</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl border border-gray-200 mb-4 overflow-hidden">
          <button
            onClick={() => setTab("login")}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${tab === "login" ? "bg-primary-deep text-white" : "text-gray-500 hover:bg-gray-50"}`}
          >
            Log In
          </button>
          <button
            onClick={() => setTab("signup")}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${tab === "signup" ? "bg-primary-deep text-white" : "text-gray-500 hover:bg-gray-50"}`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#78B159]"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#78B159]"
            required
          />
          {tab === "signup" && (
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#78B159]"
              required
            />
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
          {notice && <p className="text-sm text-green-600">{notice}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-deep hover:bg-[#314A37] text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? "..." : tab === "login" ? "Log In" : "Sign Up"}
          </button>
        </form>
      </div>
    </div>
  );
}
