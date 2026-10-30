"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage, emailRedirectTo, PASSWORD_MIN_LENGTH, PASSWORD_TOO_SHORT } from "@/lib/authErrors";
import type { User } from "@supabase/supabase-js";
import Footer from "@/components/Footer";

export default function AccountClient() {
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
    setAuthError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setAuthError(authErrorMessage(error));
  }

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    setAuthLoading(true);
    // 🔴 try/finally가 없으면 createClient()나 auth 호출이 던졌을 때
    //    authLoading이 true로 굳어 버튼이 영영 도는 상태가 된다.
    try {
      const supabase = createClient();
      if (authMode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setAuthError(authErrorMessage(error));
      } else {
        if (password.length < PASSWORD_MIN_LENGTH) {
          setAuthError(PASSWORD_TOO_SHORT);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: emailRedirectTo() },
        });
        if (error) setAuthError(authErrorMessage(error));
        else setAuthSuccess(t("account_confirm_email"));
      }
    } catch (err) {
      setAuthError(authErrorMessage(err));
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(`/${locale}`);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F5F7FA] flex items-center justify-center">
        <div className="text-gray-500">{t("account_loading")}</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F5F7FA]">
      {/* Hero */}
      <section className="text-white text-center py-16 px-4" style={{ background: "linear-gradient(135deg, #6B3600 0%, #F5A623 100%)" }}>
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
                <div className="w-16 h-16 bg-[#FFF3E0] rounded-full flex items-center justify-center text-3xl">
                  {user.user_metadata?.avatar_url ? (
                    // OAuth provider avatar URL — host is dynamic (Google, GitHub, etc.) and
                    // can't be added to next.config.images.remotePatterns ahead of time.
                    // Plain <img> is intentional here; keep noindex page so SEO impact is nil.
                    // eslint-disable-next-line @next/next/no-img-element
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
                  <h2 className="text-xl font-bold text-[#6B3600]">
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
                  <p className="text-2xl font-bold text-[#6B3600]">{t("account_plan_free")}</p>
                  <p className="text-xs text-gray-500 mt-1">{t("account_plan_label")}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-2xl shadow p-6 space-y-3">
              <Link
                href={`/${locale}/planner`}
                className="block w-full text-center bg-primary-deep hover:bg-[#6B3600] text-white font-semibold py-3 rounded-xl transition-colors"
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
              <h2 className="text-2xl font-bold text-[#6B3600] mb-2">{t("account_welcome")}</h2>
              <p className="text-gray-500 mb-6 leading-relaxed">
                {t("account_welcome_desc")}
              </p>
              <div className="bg-[#FFF3E0] rounded-xl p-4 text-left text-sm text-[#6B3600] space-y-1">
                <p className="font-semibold mb-2">{t("account_why_join")}</p>
                <p>❤️ {t("account_track_favs_feature")}</p>
                <p>📩 {t("account_email_plans_feature")}</p>
              </div>
            </div>

            {/* Auth form */}
            <div className="bg-white rounded-2xl shadow p-8">
              {/* Google OAuth — Aussie에만 있다(Supabase Google 공급자 설정됨) */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full min-h-touch flex items-center justify-center gap-2 border-2 border-gray-200 rounded-xl py-3 font-medium hover:bg-gray-50 transition-colors mb-4"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {t("login_with_google")}
              </button>

              <div className="flex items-center gap-2 mb-4">
                <div className="flex-1 border-t border-gray-200" />
                <span className="text-sm text-gray-500">{t("account_or")}</span>
                <div className="flex-1 border-t border-gray-200" />
              </div>

              {/* Mode tabs */}
              <div className="flex rounded-xl overflow-hidden border border-gray-200 mb-6">
                {(["login", "signup"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => { setAuthMode(mode); setAuthError(""); setAuthSuccess(""); }}
                    className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                      authMode === mode ? "bg-primary-deep text-white" : "text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    {mode === "login" ? t("login") : t("signup")}
                  </button>
                ))}
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
                  className="w-full bg-primary-deep hover:bg-[#6B3600] text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-60"
                >
                  {authLoading ? t("account_please_wait") : authMode === "login" ? t("login") : t("account_create_account")}
                </button>
              </form>
            </div>
          </div>
        )}
      </section>

      {/* Footer */}
      <Footer locale={locale} />
    </main>
  );
}
