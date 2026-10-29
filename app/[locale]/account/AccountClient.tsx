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
      <section className="text-white text-center py-16 px-4" style={{ background: "linear-gradient(135deg, #314A37 0%, #78B159 100%)" }}>
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
                <div className="w-16 h-16 bg-[#E8F5E9] rounded-full flex items-center justify-center text-3xl">
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
                  <h2 className="text-xl font-bold text-[#314A37]">
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
                  <p className="text-2xl font-bold text-[#314A37]">{t("account_plan_free")}</p>
                  <p className="text-xs text-gray-500 mt-1">{t("account_plan_label")}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-2xl shadow p-6 space-y-3">
              <Link
                href={`/${locale}/planner`}
                className="block w-full text-center bg-primary-deep hover:bg-[#314A37] text-white font-semibold py-3 rounded-xl transition-colors"
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
              <h2 className="text-2xl font-bold text-[#314A37] mb-2">{t("account_welcome")}</h2>
              <p className="text-gray-500 mb-6 leading-relaxed">
                {t("account_welcome_desc")}
              </p>
              <div className="bg-[#E8F5E9] rounded-xl p-4 text-left text-sm text-[#314A37] space-y-1">
                <p className="font-semibold mb-2">{t("account_why_join")}</p>
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
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#78B159] transition-colors"
                />
                <input
                  type="password"
                  placeholder={t("account_password_placeholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#78B159] transition-colors"
                />
                {authError && <p className="text-red-500 text-sm">{authError}</p>}
                {authSuccess && <p className="text-green-600 text-sm">{authSuccess}</p>}
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-primary-deep hover:bg-[#314A37] text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-60"
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
