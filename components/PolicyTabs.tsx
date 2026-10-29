"use client";

import { useState } from "react";

export default function PolicyTabs({
  privacyContent,
  disclaimerContent,
  privacyLabel,
  disclaimerLabel,
}: {
  privacyContent: React.ReactNode;
  disclaimerContent: React.ReactNode;
  privacyLabel: string;
  disclaimerLabel: string;
}) {
  const [tab, setTab] = useState<"privacy" | "disclaimer">("privacy");

  return (
    <>
      <div className="flex rounded-2xl overflow-hidden border border-gray-200 mb-8 bg-[#F7F9FC]">
        <button
          onClick={() => setTab("privacy")}
          className={`flex-1 py-3.5 text-sm font-semibold transition-colors rounded-l-2xl ${
            tab === "privacy" ? "bg-[#366A1B] text-white" : "text-gray-500 hover:bg-gray-100"
          }`}
        >
          {privacyLabel}
        </button>
        <button
          onClick={() => setTab("disclaimer")}
          className={`flex-1 py-3.5 text-sm font-semibold transition-colors rounded-r-2xl ${
            tab === "disclaimer" ? "bg-[#366A1B] text-white" : "text-gray-500 hover:bg-gray-100"
          }`}
        >
          {disclaimerLabel}
        </button>
      </div>
      <div className="bg-[#F7F9FC] rounded-3xl p-10">
        <div className={tab === "privacy" ? "" : "hidden"}>{privacyContent}</div>
        <div className={tab === "disclaimer" ? "" : "hidden"}>{disclaimerContent}</div>
      </div>
    </>
  );
}
