"use client";

import { useState, useEffect, useCallback, memo } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { PlanItem, AllergyType, Locale, PriceInfo } from "@/lib/types";
import { getIngredientCategory, getIngredientEmoji, CATEGORY_EMOJIS } from "@/lib/utils";
import { PORTION_FACTORS, DEFAULT_PORTION } from "@/lib/planConfig";
import AuthModal from "@/components/AuthModal";
import { useParams } from "next/navigation";

const ALLERGY_OPTIONS: AllergyType[] = [
  "Nut Allergy", "Dairy Allergy", "Gluten Allergy",
  "Egg Allergy", "Vegetarian", "Vegan",
];

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default function PlannerClient() {
  const t = useTranslations();
  const params = useParams();
  const locale = (params.locale as Locale) ?? "en";
  const supabase = createClient();

  // Auth state
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  // Sidebar state
  const [allergies, setAllergies] = useState<AllergyType[]>([]);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [leftover, setLeftover] = useState("");
  const [allIngredients, setAllIngredients] = useState<string[]>([]);

  // Plan state
  const [planData, setPlanData] = useState<PlanItem[]>([]);
  const [shoppingList, setShoppingList] = useState<string[]>([]);
  const [prices, setPrices] = useState<Record<string, PriceInfo>>({});
  const [generating, setGenerating] = useState(false);
  const [warning, setWarning] = useState("");
  const [error, setError] = useState("");

  // PDF / Email state
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [emailAddr, setEmailAddr] = useState("");
  const [sending, setSending] = useState(false);
  const [emailMsg, setEmailMsg] = useState("");

  // Recipe modal
  const [activeRecipe, setActiveRecipe] = useState<PlanItem | null>(null);

  // Restored plan state
  const [restored, setRestored] = useState(false);

  // Share state
  const [listCopied, setListCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Saved favorites from DB
  const [dbFavorites, setDbFavorites] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ? { email: data.session.user.email ?? "" } : null);
      if (data.session?.user?.email) setEmailAddr(data.session.user.email);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ? { email: session.user.email ?? "" } : null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    fetch(`/api/menus?locale=${locale}`)
      .then((r) => r.json())
      .then(({ menus }) => {
        const ings = new Set<string>();
        for (const m of menus) for (const i of m.ingredients) ings.add(i);
        setAllIngredients([...ings].sort());
      });
  }, [locale]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("favorites")
      .select("name")
      .then(({ data }) => setDbFavorites(data?.map((r) => r.name) ?? []));
  }, [user]);

  // Restore last plan from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("lunchbox-plan");
      if (saved && planData.length === 0) {
        const parsed = JSON.parse(saved);
        const age = Date.now() - (parsed.generatedAt ?? 0);
        if (age < 24 * 60 * 60 * 1000) {
          setPlanData(parsed.planData ?? []);
          setShoppingList(parsed.shoppingList ?? []);
          setPrices(parsed.prices ?? {});
          setRestored(true);
        }
      }
    } catch {}
  }, []);

  async function handleGenerate() {
    setGenerating(true);
    setError("");
    setWarning("");
    setPdfBlob(null);

    try {
      const res = await fetch("/api/plans/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          allergies,
          excludedIngredients: excluded,
          favoriteIngredients: favorites,
          fridgeLeftover: leftover,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPlanData(data.planData);
      setShoppingList(data.shoppingList);
      setPrices(data.prices ?? {});
      if (data.warning) setWarning(data.warning);

      // Save to localStorage for offline access
      try {
        localStorage.setItem("lunchbox-plan", JSON.stringify({
          planData: data.planData,
          shoppingList: data.shoppingList,
          prices: data.prices ?? {},
          generatedAt: Date.now(),
        }));
      } catch {}

      // Auto-generate PDF
      const pdfRes = await fetch("/api/plans/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planData: data.planData, shoppingList: data.shoppingList }),
      });
      if (pdfRes.ok) setPdfBlob(await pdfRes.blob());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate plan");
    } finally {
      setGenerating(false);
    }
  }

  async function toggleFavorite(name: string) {
    if (!user) { setShowAuth(true); return; }
    const isFav = dbFavorites.includes(name);
    if (isFav) {
      await supabase.from("favorites").delete().eq("name", name);
      setDbFavorites((prev) => prev.filter((f) => f !== name));
    } else {
      await supabase.from("favorites").insert({ name });
      setDbFavorites((prev) => [...prev, name]);
    }
  }

  async function handleSendEmail() {
    if (!emailAddr || !pdfBlob) return;
    setSending(true);
    setEmailMsg("");
    try {
      const arrayBuffer = await pdfBlob.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: emailAddr, pdfBase64: base64 }),
      });
      const data = await res.json();
      setEmailMsg(res.ok ? t("email_success") : data.error);
    } catch {
      setEmailMsg(t("email_fail"));
    } finally {
      setSending(false);
    }
  }

  async function handleCopyList() {
    const items = Object.entries(ingredientCounts)
      .map(([ing, count]) => `${getIngredientEmoji(ing)} ${ing}${count > 1 ? ` ×${count}` : ""}`)
      .join("\n");
    const text = `🛒 ${t("shopping_list")}\n\n${items}`;
    await navigator.clipboard.writeText(text);
    setListCopied(true);
    setTimeout(() => setListCopied(false), 2000);
  }

  async function handleNativeShare() {
    const shareData: ShareData = {
      title: t("share_plan_text"),
      text: `${t("share_plan_text")}\n\n🛒 ${t("shopping_list")}:\n${shoppingList.slice(0, 10).join(", ")}${shoppingList.length > 10 ? "..." : ""}`,
    };

    if (pdfBlob && navigator.canShare?.({ files: [new File([pdfBlob], "plan.pdf", { type: "application/pdf" })] })) {
      shareData.files = [new File([pdfBlob], "aussie_lunchbox_plan.pdf", { type: "application/pdf" })];
    }

    try {
      await navigator.share(shareData);
    } catch {}
  }

  function handleWhatsAppShare() {
    const items = shoppingList.slice(0, 15).join(", ");
    const text = `${t("share_plan_text")} 🦘\n\n🛒 ${t("shopping_list")}: ${items}${shoppingList.length > 15 ? "..." : ""}\n\nhttps://www.aussielunchbox.com/en/planner`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  function handleFacebookShare() {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent("https://www.aussielunchbox.com/en/planner")}`, "_blank", "width=600,height=400");
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText("https://www.aussielunchbox.com/en/planner");
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  // Shopping list summary
  const ingredientCounts = shoppingList.reduce<Record<string, number>>((acc, ing) => {
    acc[ing] = (acc[ing] ?? 0) + 1;
    return acc;
  }, {});
  const catItems = Object.entries(ingredientCounts).reduce<
    Record<string, { name: string; count: number; emoji: string; price?: number; source?: string }[]>
  >((acc, [ing, count]) => {
    const cat = getIngredientCategory(ing);
    if (!acc[cat]) acc[cat] = [];
    const priceInfo = prices[ing];
    acc[cat].push({
      name: ing,
      count,
      emoji: getIngredientEmoji(ing),
      price: priceInfo?.price,
      source: priceInfo?.source,
    });
    return acc;
  }, {});

  const totalCost = Object.values(catItems)
    .flat()
    .reduce((sum, item) => sum + (item.price ?? 0) * (PORTION_FACTORS[item.name] ?? DEFAULT_PORTION) * item.count, 0);

  return (
    <div className="min-h-screen bg-[#FDFAF2] flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="w-full lg:w-80 bg-white border-r border-gray-100 p-6 flex-shrink-0">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-[#7B3F00]">🦘 {t("sidebar_header")}</h2>
          {user ? (
            <button
              onClick={() => supabase.auth.signOut()}
              className="text-xs text-gray-400 hover:text-red-500"
            >
              {t("logout")}
            </button>
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className="text-xs bg-[#F5A623] text-white px-3 py-1 rounded-full hover:bg-[#7B3F00] transition-colors"
            >
              {t("login")}
            </button>
          )}
        </div>

        {/* Allergies */}
        <details open className="mb-4">
          <summary className="cursor-pointer font-semibold text-sm text-gray-600 mb-2">{t("allergies")}</summary>
          <div className="flex flex-wrap gap-2 mt-2">
            {ALLERGY_OPTIONS.map((a) => (
              <button
                key={a}
                onClick={() =>
                  setAllergies((prev) =>
                    prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
                  )
                }
                className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                  allergies.includes(a)
                    ? "bg-[#F5A623] text-white border-[#F5A623]"
                    : "bg-white text-gray-600 border-gray-200 hover:border-[#F5A623]"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </details>

        {/* Exclude Ingredients */}
        <details className="mb-4">
          <summary className="cursor-pointer font-semibold text-sm text-gray-600 mb-2">{t("exclude")}</summary>
          <div className="flex flex-wrap gap-1 mt-2 max-h-32 overflow-y-auto">
            {allIngredients.map((ing) => (
              <button
                key={ing}
                onClick={() =>
                  setExcluded((prev) =>
                    prev.includes(ing) ? prev.filter((x) => x !== ing) : [...prev, ing]
                  )
                }
                className={`px-2 py-0.5 rounded text-xs border transition-colors ${
                  excluded.includes(ing)
                    ? "bg-red-100 text-red-700 border-red-200"
                    : "bg-white text-gray-500 border-gray-100 hover:border-gray-300"
                }`}
              >
                {ing}
              </button>
            ))}
          </div>
        </details>

        {/* Fridge Leftover */}
        <details className="mb-4">
          <summary className="cursor-pointer font-semibold text-sm text-gray-600 mb-2">{t("leftovers")}</summary>
          <input
            type="text"
            value={leftover}
            onChange={(e) => setLeftover(e.target.value)}
            placeholder={t("leftovers_placeholder")}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-2 focus:outline-none focus:border-[#F5A623]"
          />
        </details>

        {/* Saved Favorites */}
        {user && dbFavorites.length > 0 && (
          <details className="mb-4">
            <summary className="cursor-pointer font-semibold text-sm text-gray-600 mb-2">{t("favorites")}</summary>
            <ul className="mt-2 space-y-1">
              {dbFavorites.map((f) => (
                <li key={f} className="text-sm text-gray-600 flex items-center gap-1">
                  <span>❤️</span> {f}
                </li>
              ))}
            </ul>
          </details>
        )}

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full bg-[#F5A623] hover:bg-[#7B3F00] text-white font-bold py-3 rounded-xl transition-colors mt-4 disabled:opacity-60"
        >
          {generating ? t("generating") : t("generate_btn")}
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
        <h1 className="text-3xl font-bold text-[#7B3F00] mb-2">{t("title")}</h1>
        <p className="text-gray-500 mb-8">{t("subtitle")}</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6">{error}</div>
        )}
        {warning && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-xl p-4 mb-6">{warning}</div>
        )}
        {restored && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 rounded-xl p-4 mb-6 flex items-center justify-between">
            <span>📱 {t("planner_restored")}</span>
            <button onClick={() => setRestored(false)} className="text-blue-400 hover:text-blue-600 text-sm font-medium">{t("planner_restore_dismiss")}</button>
          </div>
        )}

        {/* Plan Grid */}
        {planData.length > 0 && (
          <>
            <h2 className="text-xl font-bold text-[#7B3F00] mb-4">📅 {t("weekly_plan")}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-10">
              {planData.map((item) => (
                <div key={item.day} className="bg-white rounded-2xl shadow overflow-hidden flex flex-col">
                  {/* Image */}
                  <div className="w-full h-44 bg-gray-100 flex items-center justify-center overflow-hidden">
                    {item.image && !item.image.startsWith("assets/") ? (
                      <img src={item.image} alt={item.menuName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-6xl">🥗</span>
                    )}
                  </div>

                  <div className="p-4 flex flex-col flex-1">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-bold text-[#7B3F00] text-base leading-tight">{item.menuName}</h3>
                      <button
                        onClick={() => toggleFavorite(item.menuName)}
                        className="text-xl ml-2 flex-shrink-0"
                      >
                        {dbFavorites.includes(item.menuName) ? "❤️" : "🤍"}
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-gray-400 font-medium">{item.day}</span>
                      <span className="text-xs bg-[#FFF4DE] text-[#7B3F00] px-2 py-0.5 rounded-full">{item.category}</span>
                    </div>
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">{item.description}</p>

                    {/* Snacks */}
                    {item.snacks?.length > 0 && (
                      <div className="text-xs text-gray-400 mb-3">
                        🍎 {item.snacks.map((s) => s.name).join(" • ")}
                      </div>
                    )}

                    <div className="mt-auto flex items-center justify-between">
                      <span className="font-bold text-[#7B3F00]">{item.estCost}</span>
                      <button
                        onClick={() => setActiveRecipe(item)}
                        className="text-sm bg-[#FFF4DE] text-[#7B3F00] px-3 py-1.5 rounded-lg hover:bg-[#F5A623] hover:text-white transition-colors"
                      >
                        {t("view_recipe")}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Export, Share & Email */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              <div className="bg-white rounded-2xl shadow p-6 flex flex-col">
                <h3 className="font-bold text-[#7B3F00] mb-3">📥 {t("download_pdf")}</h3>
                <div className="flex-1 flex flex-col justify-end">
                  {pdfBlob ? (
                    <a
                      href={URL.createObjectURL(pdfBlob)}
                      download="aussie_lunchbox_plan.pdf"
                      className="block w-full bg-[#F5A623] hover:bg-[#7B3F00] text-white font-bold py-3 rounded-xl text-center transition-colors"
                    >
                      ⬇️ {t("download_pdf")}
                    </a>
                  ) : (
                    <div className="text-gray-400 text-sm py-3">Generating PDF...</div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow p-6 flex flex-col">
                <h3 className="font-bold text-[#7B3F00] mb-3">📤 {t("share_title")}</h3>
                <div className="flex-1 flex flex-col gap-2 justify-end">
                  <button
                    onClick={handleCopyList}
                    className="w-full bg-[#FFF8EE] text-[#7B3F00] font-bold py-3 rounded-xl hover:bg-[#F5A623] hover:text-white transition-colors"
                  >
                    {listCopied ? `✅ ${t("share_copied")}` : `📋 ${t("share_copy_list")}`}
                  </button>
                  {typeof navigator !== "undefined" && !!navigator.share && (
                    <button
                      onClick={handleNativeShare}
                      className="w-full bg-[#F5A623] hover:bg-[#7B3F00] text-white font-bold py-3 rounded-xl transition-colors"
                    >
                      📤 {t("share_native")}
                    </button>
                  )}
                  <div className="flex gap-2 mt-1">
                    <button onClick={handleWhatsAppShare} className="flex-1 bg-[#25D366] text-white font-bold py-2 rounded-xl text-sm hover:opacity-90 transition-opacity">
                      {t("share_whatsapp")}
                    </button>
                    <button onClick={handleFacebookShare} className="flex-1 bg-[#1877F2] text-white font-bold py-2 rounded-xl text-sm hover:opacity-90 transition-opacity">
                      {t("share_facebook")}
                    </button>
                    <button onClick={handleCopyLink} className="flex-1 bg-gray-100 text-gray-700 font-bold py-2 rounded-xl text-sm hover:bg-gray-200 transition-colors">
                      {linkCopied ? `✅` : `🔗`}
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow p-6 flex flex-col">
                <h3 className="font-bold text-[#7B3F00] mb-3">✉️ Email to yourself</h3>
                <div className="flex-1 flex flex-col justify-end">
                  <input
                    type="email"
                    value={emailAddr}
                    onChange={(e) => setEmailAddr(e.target.value)}
                    placeholder={t("email_placeholder")}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm mb-3 focus:outline-none focus:border-[#F5A623]"
                  />
                  <button
                    onClick={handleSendEmail}
                    disabled={sending || !pdfBlob}
                    className="w-full bg-[#F5A623] hover:bg-[#7B3F00] text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {sending ? t("planner_sending") : t("email_btn")}
                  </button>
                  {emailMsg && <p className="text-sm mt-2 text-gray-600">{emailMsg}</p>}
                </div>
              </div>
            </div>

            {/* Shopping List */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[#7B3F00]">{t("shopping_list")}</h2>
              {totalCost > 0 && (
                <span className="bg-[#FFF4DE] text-[#7B3F00] font-bold px-4 py-1.5 rounded-full text-sm">
                  Est. Total: ${totalCost.toFixed(2)}
                </span>
              )}
            </div>
            <div className="bg-white rounded-2xl shadow overflow-hidden">
              {/* Column header */}
              <div className="grid grid-cols-[1fr_auto] gap-2 px-5 py-2.5 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                <span>Ingredient</span>
                <span className="text-right">Unit / Portion</span>
              </div>
              {Object.entries(catItems).map(([cat, items]) => (
                <div key={cat}>
                  <div className="px-5 py-2 bg-[#FDFAF2] border-b border-gray-100">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      {CATEGORY_EMOJIS[cat] ?? "🛒"} {cat}
                    </span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {items.sort((a, b) => a.name.localeCompare(b.name)).map((item) => {
                      const portion = PORTION_FACTORS[item.name] ?? DEFAULT_PORTION;
                      const portionCost = item.price !== undefined ? item.price * portion : undefined;
                      const totalItemCost = portionCost !== undefined ? portionCost * item.count : undefined;
                      return (
                        <div key={item.name} className="flex items-center gap-3 px-5 py-2.5">
                          <span className="text-xl w-7 flex-shrink-0 text-center">{item.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-gray-800 font-medium">{item.name}</span>
                            {item.count > 1 && (
                              <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">×{item.count}</span>
                            )}
                          </div>
                          {item.price !== undefined && (
                            <div className="text-right flex-shrink-0 space-y-0.5">
                              <div className="flex items-center justify-end gap-1.5">
                                <span className="text-xs text-gray-400">${item.price.toFixed(2)}</span>
                                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                  item.source === "Woolworths AU"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-gray-100 text-gray-400"
                                }`}>
                                  {item.source === "Woolworths AU" ? "Live" : "Est."}
                                </span>
                              </div>
                              {totalItemCost !== undefined && (
                                <div className="text-sm font-bold text-[#7B3F00]">
                                  ${totalItemCost.toFixed(2)}
                                  <span className="text-xs font-normal text-gray-400 ml-1">portion</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {planData.length === 0 && !generating && (
          <div>
            {/* Desktop: subtle pointer to sidebar button */}
            <div className="hidden lg:flex items-center gap-2 mb-5 bg-[#FFF4DE] border border-[#F5A623]/30 rounded-xl px-4 py-3 text-sm text-[#7B3F00]">
              <span className="text-lg">👈</span>
              <span>Set any dietary filters on the left, then click <strong>Generate Plan</strong> to get your personalised week of lunches.</span>
            </div>
            {/* Mobile: button-style CTA */}
            <button
              onClick={handleGenerate}
              className="lg:hidden w-full bg-[#F5A623] hover:bg-[#7B3F00] text-white font-bold py-4 rounded-xl transition-colors mb-5 text-lg"
            >
              ✨ Generate My Lunch Plan
            </button>
            <div className="flex flex-col items-center justify-center py-6 text-center mb-4">
              <div className="text-6xl mb-4">🥗</div>
              <h2 className="text-2xl font-bold text-[#7B3F00] mb-2">Your personalised lunch plan starts here</h2>
              <p className="text-gray-500 max-w-sm text-sm mb-5">
                Tell us your family&apos;s dietary needs and we&apos;ll generate a full 5-day school lunch plan — with ingredients, estimated costs, and a printable shopping list.
              </p>
              <ol className="text-left text-sm space-y-2 max-w-xs w-full">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#F5A623] text-white text-xs font-bold flex items-center justify-center mt-0.5">1</span>
                  <span className="text-gray-600"><span className="hidden lg:inline">Set allergy filters in the left panel</span><span className="lg:hidden">Tap the filter icons above to set dietary needs</span></span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#F5A623] text-white text-xs font-bold flex items-center justify-center mt-0.5">2</span>
                  <span className="text-gray-600">Click <strong className="text-[#7B3F00]">Generate Plan</strong> — takes about 5 seconds</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#F5A623] text-white text-xs font-bold flex items-center justify-center mt-0.5">3</span>
                  <span className="text-gray-600">Download as PDF or email yourself the shopping list</span>
                </li>
              </ol>
            </div>

            {/* Sample plan preview */}
            <div className="bg-white rounded-2xl shadow p-6 mb-6">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Example — what your plan looks like</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 mb-5">
                {[
                  { day: "Monday", menu: "Vegemite & Cheese Scrolls", cost: "$1.80", tag: "Baking", cal: "380 kcal", image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=75&auto=format&fit=crop" },
                  { day: "Tuesday", menu: "Chicken Rice Paper Rolls", cost: "$2.80", tag: "Cold", cal: "320 kcal", image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=75&auto=format&fit=crop" },
                  { day: "Wednesday", menu: "Pesto Pasta Salad", cost: "$2.10", tag: "Cold", cal: "290 kcal", image: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=400&q=75&auto=format&fit=crop" },
                  { day: "Thursday", menu: "Mini Quiches", cost: "$2.50", tag: "Hot", cal: "310 kcal", image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=75&auto=format&fit=crop" },
                  { day: "Friday", menu: "Homemade Sushi Rolls", cost: "$3.20", tag: "Cold", cal: "340 kcal", image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=75&auto=format&fit=crop" },
                ].map((d) => (
                  <div key={d.day} className="bg-[#FDFAF2] rounded-xl overflow-hidden flex flex-col">
                    <div className="h-24 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={d.image} alt={d.menu} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <div className="p-3 flex flex-col gap-1 flex-1">
                      <p className="text-xs font-bold text-[#F5A623]">{d.day}</p>
                      <p className="text-sm font-semibold text-[#7B3F00] leading-tight">{d.menu}</p>
                      <div className="flex items-center gap-1.5 mt-auto pt-1">
                        <span className="text-xs bg-[#FFF4DE] text-[#7B3F00] px-2 py-0.5 rounded-full">{d.tag}</span>
                        <span className="text-xs text-gray-400">{d.cal}</span>
                      </div>
                      <p className="text-sm font-bold text-[#7B3F00]">{d.cost}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm">
                <div className="text-gray-500">
                  Est. weekly cost: <strong className="text-[#7B3F00]">~$12.40</strong>
                  <span className="mx-2 text-gray-300">·</span>
                  Avg: <strong className="text-[#7B3F00]">328 kcal/day</strong>
                </div>
                <div className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
                  🛒 Shopping list: 14 items · 4 categories
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-6 px-1">
              <span className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                ✅ Allergy-safe by default
              </span>
              <span className="text-xs text-gray-400">Nut-free, dairy-free, gluten-free, and vegan filters available — applied to every meal in the plan.</span>
            </div>

            {/* Sample shopping list preview */}
            <div className="bg-white rounded-2xl shadow p-6">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Example — shopping list</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { cat: "🥩 Meat & Seafood", items: ["Chicken breast", "Smoked salmon"] },
                  { cat: "🥦 Produce", items: ["Cucumber", "Avocado", "Spinach leaves", "Cherry tomatoes"] },
                  { cat: "🧀 Dairy & Eggs", items: ["Cheddar cheese", "Eggs (×4)"] },
                  { cat: "🍞 Bakery & Pantry", items: ["Rice paper wrappers", "Pasta (penne)", "Nori sheets"] },
                ].map((section) => (
                  <div key={section.cat}>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{section.cat}</p>
                    <ul className="space-y-1">
                      {section.items.map((item) => (
                        <li key={item} className="text-sm text-gray-600 flex items-center gap-2">
                          <span className="w-4 h-4 border border-gray-200 rounded flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Auth Modal */}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      {/* Recipe Modal */}
      {activeRecipe && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setActiveRecipe(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Menu image */}
            {activeRecipe.image && activeRecipe.image.startsWith("/assets/") ? (
              <div className="relative w-full h-48 overflow-hidden rounded-t-2xl bg-gray-100">
                <img
                  src={activeRecipe.image}
                  alt={activeRecipe.menuName}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => setActiveRecipe(null)}
                  className="absolute top-3 right-3 bg-white/80 hover:bg-white text-gray-600 rounded-full w-8 h-8 flex items-center justify-center shadow text-lg font-bold"
                >
                  ×
                </button>
              </div>
            ) : (
              <div className="relative w-full h-32 bg-gradient-to-br from-[#FFF4DE] to-[#FDFAF2] rounded-t-2xl flex items-center justify-center">
                <span className="text-6xl">🥗</span>
                <button
                  onClick={() => setActiveRecipe(null)}
                  className="absolute top-3 right-3 bg-white/80 hover:bg-white text-gray-600 rounded-full w-8 h-8 flex items-center justify-center shadow text-lg font-bold"
                >
                  ×
                </button>
              </div>
            )}

            <div className="p-6">
              {/* Title & badges */}
              <h2 className="text-xl font-bold text-[#7B3F00] mb-2">{activeRecipe.menuName}</h2>
              <div className="flex flex-wrap gap-2 mb-5">
                <span className="bg-[#FFF4DE] text-[#7B3F00] text-xs font-semibold px-3 py-1 rounded-full">📅 {activeRecipe.day}</span>
                <span className="bg-[#FFF4DE] text-[#7B3F00] text-xs font-semibold px-3 py-1 rounded-full">💰 {activeRecipe.estCost}</span>
                <span className="bg-orange-50 text-orange-600 text-xs font-semibold px-3 py-1 rounded-full">🔥 {activeRecipe.nutrition.calories} kcal</span>
              </div>

              {/* Ingredients */}
              <h3 className="font-bold text-[#7B3F00] mb-2">📝 {t("ingredients")}</h3>
              <ul className="mb-5 space-y-1">
                {activeRecipe.rawIngredients.map((ing) => (
                  <li key={ing} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-base">{getIngredientEmoji(ing)}</span>
                    {ing}
                  </li>
                ))}
              </ul>

              {/* Instructions — parsed into steps */}
              <h3 className="font-bold text-[#7B3F00] mb-3">👩‍🍳 Instructions</h3>
              <RecipeInstructions text={activeRecipe.instructions} />

              {/* Snacks */}
              {activeRecipe.snacks && activeRecipe.snacks.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <h3 className="font-bold text-[#7B3F00] mb-2">🍎 Snacks</h3>
                  <div className="flex flex-wrap gap-2">
                    {activeRecipe.snacks.map((s) => (
                      <span key={s.name} className="bg-[#FFF4DE] text-[#7B3F00] text-xs font-medium px-3 py-1.5 rounded-full">
                        {getIngredientEmoji(s.name)} {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setActiveRecipe(null)}
                className="mt-6 w-full bg-[#FFF4DE] text-[#7B3F00] font-bold py-3 rounded-xl hover:bg-[#F5A623] hover:text-white transition-colors"
              >
                {t("close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Parses instruction text (may contain **Bold:** and numbered lists) into steps
const RecipeInstructions = memo(function RecipeInstructions({ text }: { text?: string }) {
  if (!text) return <p className="text-sm text-gray-400">No instructions available.</p>;

  // Split into lines, clean markdown bold markers
  const raw = text.replace(/\*\*([^*]+)\*\*/g, "$1");
  const lines = raw.split(/\\n|\n/).map((l) => l.trim()).filter(Boolean);

  const steps: { type: "header" | "step" | "text"; content: string; num?: number }[] = [];
  for (const line of lines) {
    const numbered = line.match(/^(\d+)\.\s+(.+)/);
    if (numbered) {
      steps.push({ type: "step", content: numbered[2], num: parseInt(numbered[1]) });
    } else if (line.endsWith(":")) {
      steps.push({ type: "header", content: line });
    } else {
      steps.push({ type: "text", content: line });
    }
  }

  return (
    <div className="space-y-2">
      {steps.map((s, i) => {
        if (s.type === "header") {
          return (
            <p key={i} className="text-xs font-bold text-gray-400 uppercase tracking-wide mt-3">
              {s.content}
            </p>
          );
        }
        if (s.type === "step") {
          return (
            <div key={i} className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#F5A623] text-white text-xs font-bold flex items-center justify-center mt-0.5">
                {s.num}
              </span>
              <p className="text-sm text-gray-700 leading-relaxed">{s.content}</p>
            </div>
          );
        }
        return (
          <p key={i} className="text-sm text-gray-700 leading-relaxed">{s.content}</p>
        );
      })}
    </div>
  );
});
