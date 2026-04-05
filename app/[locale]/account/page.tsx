"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useTranslations } from "next-intl";

export default function AccountPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "en";
  const router = useRouter();
  const t = useTranslations();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Auth form state (for guests)
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleGoogleLogin() {
    const supabase = createClient();
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) setAuthError(error.message);
    setAuthLoading(false);
  }

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    setAuthLoading(true);
    const supabase = createClient();
    if (authMode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setAuthError(error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setAuthError(error.message);
      else setAuthSuccess(t("account_confirm_email"));
    }
    setAuthLoading(false);
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(`/${locale}`);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FDFAF2] flex items-center justify-center">
        <div className="text-gray-400">{t("account_loading")}</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FDFAF2]">
      {/* Hero */}
      <section className="text-white text-center py-16 px-4" style={{ background: "linear-gradient(135deg, #7B3F00 0%, #F5A623 100%)" }}>
        <h1 className="text-4xl font-bold mb-3">👤 {t("account_title")}</h1>
        <p className="text-lg opacity-90">{t("account_subtitle")}</p>
      </section>

      <section className="max-w-lg mx-auto py-16 px-4">
        {user ? (
          /* Logged-in view */
          <div className="space-y-6">
            {/* Profile card */}
            <div className="bg-white rounded-2xl shadow p-8">
              <div className="flex items-center gap-5 mb-6">
                <div className="w-16 h-16 bg-[#FFF4DE] rounded-full flex items-center justify-center text-3xl">
                  {user.user_metadata?.avatar_url ? (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt="avatar"
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    "👤"
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#7B3F00]">
                    {user.user_metadata?.full_name ?? user.email?.split("@")[0]}
                  </h2>
                  <p className="text-gray-500 text-sm">{user.email}</p>
                  <span className="inline-block mt-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                    {t("account_active_member")}
                  </span>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-5 flex justify-around text-center">
                <div>
                  <p className="text-2xl font-bold text-[#7B3F00]">{t("account_plan_free")}</p>
                  <p className="text-xs text-gray-400 mt-1">{t("account_plan_label")}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#7B3F00]">–</p>
                  <p className="text-xs text-gray-400 mt-1">{t("account_saved_plans")}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#7B3F00]">–</p>
                  <p className="text-xs text-gray-400 mt-1">{t("account_favourites")}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-2xl shadow p-6 space-y-3">
              <Link
                href={`/${locale}/planner`}
                className="block w-full text-center bg-[#F5A623] hover:bg-[#7B3F00] text-white font-semibold py-3 rounded-xl transition-colors"
              >
                🍱 {t("account_go_planner")}
              </Link>
              <button
                onClick={handleSignOut}
                className="w-full border border-red-300 text-red-500 hover:bg-red-50 font-semibold py-3 rounded-xl transition-colors"
              >
                {t("account_sign_out")}
              </button>
            </div>
          </div>
        ) : (
          /* Guest view */
          <div className="space-y-6">
            {/* Why join */}
            <div className="bg-white rounded-2xl shadow p-8 text-center">
              <div className="text-5xl mb-4">👋</div>
              <h2 className="text-2xl font-bold text-[#7B3F00] mb-2">{t("account_welcome")}</h2>
              <p className="text-gray-500 mb-6 leading-relaxed">
                {t("account_welcome_desc")}
              </p>
              <div className="bg-[#FFF4DE] rounded-xl p-4 text-left text-sm text-[#7B3F00] space-y-1">
                <p className="font-semibold mb-2">{t("account_why_join")}</p>
                <p>✨ {t("account_save_plans_feature")}</p>
                <p>❤️ {t("account_track_favs_feature")}</p>
                <p>📩 {t("account_email_plans_feature")}</p>
              </div>
            </div>

            {/* Auth form */}
            <div className="bg-white rounded-2xl shadow p-8">
              {/* Mode tabs */}
              <div className="flex rounded-xl overflow-hidden border border-gray-200 mb-6">
                {(["login", "signup"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => { setAuthMode(mode); setAuthError(""); setAuthSuccess(""); }}
                    className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                      authMode === mode ? "bg-[#F5A623] text-white" : "text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    {mode === "login" ? t("login") : t("signup")}
                  </button>
                ))}
              </div>

              {/* Google OAuth */}
              <button
                onClick={handleGoogleLogin}
                disabled={authLoading}
                className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-xl py-3 text-gray-700 font-medium hover:bg-gray-50 transition-colors mb-4"
              >
                <svg className="w-5 h-5" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                {t("login_with_google")}
              </button>

              <div className="flex items-center gap-3 text-gray-300 text-sm mb-4">
                <div className="flex-1 border-t" />
                <span className="text-gray-400">or</span>
                <div className="flex-1 border-t" />
              </div>

              {/* Email/password form */}
              <form onSubmit={handleEmailAuth} className="space-y-3">
                <input
                  type="email"
                  placeholder={t("account_email_placeholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#F5A623] transition-colors"
                />
                <input
                  type="password"
                  placeholder={t("account_password_placeholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#F5A623] transition-colors"
                />
                {authError && <p className="text-red-500 text-sm">{authError}</p>}
                {authSuccess && <p className="text-green-600 text-sm">{authSuccess}</p>}
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-[#F5A623] hover:bg-[#7B3F00] text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-60"
                >
                  {authLoading ? t("account_please_wait") : authMode === "login" ? t("login") : t("account_create_account")}
                </button>
              </form>
            </div>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="bg-[#7B3F00] text-white py-8 px-4">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm opacity-75">
            {t("footer_copyright", { year: new Date().getFullYear() })}
          </p>
          <div className="flex gap-4 text-sm opacity-75">
            <Link href={`/${locale}/terms`} className="hover:opacity-100">{t("footer_terms")}</Link>
            <Link href={`/${locale}/policies`} className="hover:opacity-100">{t("footer_privacy")}</Link>
            <Link href={`/${locale}/contact`} className="hover:opacity-100">{t("footer_contact")}</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
