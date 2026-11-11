"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  FileText,
  Target,
  Mail,
  Languages,
  Copy,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Save,
  RefreshCw,
} from "lucide-react";
import {
  aiSummarizeCaseAction,
  aiSuggestClassificationAction,
  aiDraftReplyAction,
  aiTranslateAction,
  aiExplainOverlapAction,
} from "@/actions/ai-actions";
import { addRemarkAction } from "@/actions/case-actions";
import { useToast } from "@/components/ui/toast";
import { LANGUAGE_BADGE } from "@/lib/services/language-detect";
import { cn } from "@/lib/utils";

export interface CaseAiPanelProps {
  caseItem: any;
  actions: any[];
  comments: any[];
  overlapAlert?: any;
  collidingCase?: any;
  currentUser: any;
}

const REPLY_TYPES: { value: ReplyType; label: string }[] = [
  { value: "ACKNOWLEDGEMENT", label: "Acknowledgement of receipt" },
  { value: "STATUS_UPDATE", label: "Status update" },
  { value: "RESOLUTION", label: "Resolution / disposal" },
  { value: "SHOW_CAUSE", label: "Show-cause notice (to institution)" },
  { value: "HEARING_NOTICE", label: "Hearing notice" },
];

type ReplyType =
  | "ACKNOWLEDGEMENT"
  | "STATUS_UPDATE"
  | "RESOLUTION"
  | "SHOW_CAUSE"
  | "HEARING_NOTICE";

function formatDate(value: any) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(value);
  }
}

export function CaseAiPanel({
  caseItem,
  actions,
  comments,
  overlapAlert,
  collidingCase,
  currentUser,
}: CaseAiPanelProps) {
  const router = useRouter();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<
    "summary" | "classification" | "reply" | "translate" | "overlap" | null
  >("summary");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [disabled, setDisabled] = useState(false);

  // Summary
  const [summary, setSummary] = useState<any>(null);
  const [isSavingRemark, setIsSavingRemark] = useState(false);

  // Classification
  const [classification, setClassification] = useState<any>(null);

  // Reply
  const [replyType, setReplyType] = useState<ReplyType>("ACKNOWLEDGEMENT");
  const [reply, setReply] = useState<any>(null);
  const [replyLanguage, setReplyLanguage] = useState(caseItem.language || "en");

  // Translate
  const [translateFrom, setTranslateFrom] = useState(caseItem.language || "en");
  const [translateTo, setTranslateTo] = useState("en");
  const [translateInput, setTranslateInput] = useState(caseItem.description || "");
  const [translation, setTranslation] = useState<any>(null);

  // Overlap
  const [overlapExplanation, setOverlapExplanation] = useState<any>(null);

  const caseLanguage = caseItem.language;
  const languageBadge = caseLanguage ? LANGUAGE_BADGE[caseLanguage as string] : null;

  const handleGenerate = useCallback(async (kind: string) => {
    setError("");
    setIsLoading(true);
    try {
      if (kind === "summary") {
        const res = await aiSummarizeCaseAction({ caseId: caseItem.id });
        if (res.disabled) {
          setDisabled(true);
          setError(res.error || "AI is not configured.");
        } else if (!res.success) {
          setError(res.error || "Failed to generate summary.");
        } else {
          setSummary(res.data);
        }
      } else if (kind === "classification") {
        const res = await aiSuggestClassificationAction({
          caseId: caseItem.id,
          description: caseItem.description,
          language: caseItem.language,
          institutionState: caseItem.institution?.state,
          currentCategory: caseItem.category,
          currentBureau: caseItem.assigned_bureau,
          currentPriority: caseItem.priority,
        });
        if (res.disabled) {
          setDisabled(true);
          setError(res.error || "AI is not configured.");
        } else if (!res.success) {
          setError(res.error || "Failed to classify.");
        } else {
          setClassification(res.data);
        }
      } else if (kind === "reply") {
        const res = await aiDraftReplyAction({
          caseId: caseItem.id,
          replyType,
          language: replyLanguage,
          officerName: currentUser?.name,
        });
        if (res.disabled) {
          setDisabled(true);
          setError(res.error || "AI is not configured.");
        } else if (!res.success) {
          setError(res.error || "Failed to draft reply.");
        } else {
          setReply(res.data);
        }
      } else if (kind === "translate") {
        const res = await aiTranslateAction({
          text: translateInput,
          from: translateFrom,
          to: translateTo,
        });
        if (res.disabled) {
          setDisabled(true);
          setError(res.error || "AI is not configured.");
        } else if (!res.success) {
          setError(res.error || "Failed to translate.");
        } else {
          setTranslation(res.data);
        }
      } else if (kind === "overlap") {
        if (!overlapAlert) return;
        const res = await aiExplainOverlapAction({ alertId: overlapAlert.id });
        if (res.disabled) {
          setDisabled(true);
          setError(res.error || "AI is not configured.");
        } else if (!res.success) {
          setError(res.error || "Failed to explain overlap.");
        } else {
          setOverlapExplanation(res.data);
        }
      }
    } catch (err: any) {
      setError(err.message || "AI request failed.");
    } finally {
      setIsLoading(false);
    }
  }, [
    caseItem,
    actions,
    comments,
    overlapAlert,
    collidingCase,
    currentUser,
    replyType,
    replyLanguage,
    translateFrom,
    translateTo,
    translateInput,
  ]);

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setError("Copied to clipboard.");
      setTimeout(() => setError(""), 1800);
    });
  };

  const saveSummaryAsRemark = async () => {
    if (!summary) return;
    setIsSavingRemark(true);
    const lines = [
      `AI case summary (${caseItem.case_id})`,
      "",
      summary.executiveSummary,
      "",
      "Key facts:",
      ...(summary.keyFacts ?? []).map((f: string) => `• ${f}`),
      "",
      "Suggested next steps:",
      ...(summary.suggestedNextSteps ?? []).map((s: string, i: number) => `${i + 1}. ${s}`),
      "",
      "— Drafted by AI Assistant, reviewed before recording.",
    ];
    const res = await addRemarkAction({
      caseId: caseItem.id,
      remarks: lines.join("\n"),
    });
    setIsSavingRemark(false);
    if (res.success) {
      toast.success("Summary saved", "The AI briefing is now on the immutable case timeline.");
      router.refresh();
    } else {
      toast.error("Could not save", res.error || "Please try again.");
    }
  };

  if (disabled) {
    return (
      <div className="panel rounded-xl border border-slate-200 bg-amber-50/70 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <h3 className="font-semibold text-sm text-amber-900">AI features disabled</h3>
            <p className="text-[11px] text-amber-800/85">
              {error || "GROQ_API_KEY is not configured. Get a free key at https://console.groq.com/keys and add it to .env."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* AI assistant header / tab strip */}
      <div className="panel rounded-xl border border-slate-200 bg-slate-50/70 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-brand-600" />
          <h2 className="font-semibold text-sm text-slate-800">AI Assistant</h2>
          <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500">
            {languageBadge ? (
              <>
                <span className="mr-1">{languageBadge.label}</span>
                multilingual
              </>
            ) : (
              "English intake"
            )}
          </span>
        </div>

        <div className="flex flex-wrap gap-1">
          {[
            { id: "summary" as const, label: "Case summary", icon: <FileText className="h-3 w-3" /> },
            { id: "classification" as const, label: "Smart classification", icon: <Target className="h-3 w-3" /> },
            { id: "reply" as const, label: "Draft reply", icon: <Mail className="h-3 w-3" /> },
            { id: "translate" as const, label: "Translate", icon: <Languages className="h-3 w-3" /> },
            ...(overlapAlert
              ? [{ id: "overlap" as const, label: "Explain overlap", icon: <ArrowRight className="h-3 w-3" /> }]
              : []),
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setError("");
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[10.5px] font-medium transition-colors",
                activeTab === tab.id
                  ? "border-brand-300 bg-brand-50 text-brand-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:bg-brand-50/40"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <p role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-700">
            {error}
          </p>
        )}
      </div>

      {/* Summary result */}
      {activeTab === "summary" && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          {isLoading ? (
            <div className="space-y-2.5" aria-busy="true">
              <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200/70" />
              <div className="h-3 w-full animate-pulse rounded bg-slate-200/60" />
              <div className="h-3 w-5/6 animate-pulse rounded bg-slate-200/60" />
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="h-20 animate-pulse rounded-xl bg-slate-200/50" />
                <div className="h-20 animate-pulse rounded-xl bg-slate-200/50" />
              </div>
              <p className="text-[11px] text-slate-400">Generating case summary…</p>
            </div>
          ) : summary ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-sm text-slate-800">Executive summary</h3>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleGenerate("summary")}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10.5px] font-bold text-slate-600 hover:bg-slate-50"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Regenerate
                  </button>
                  <button
                    onClick={saveSummaryAsRemark}
                    disabled={isSavingRemark}
                    className="flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1.5 text-[10.5px] font-bold text-brand-700 hover:bg-brand-100 disabled:opacity-50"
                  >
                    <Save className="h-3 w-3" />
                    {isSavingRemark ? "Saving…" : "Save as case remark"}
                  </button>
                </div>
              </div>
              <div>
                <p className="mt-1 text-[11.5px] leading-relaxed text-slate-700 whitespace-pre-wrap">
                  {summary.executiveSummary}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <h4 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 mb-2">Key facts</h4>
                  <ul className="space-y-1 text-[11px] text-slate-700 list-disc list-inside">
                    {summary.keyFacts.map((f: string, i: number) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <h4 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 mb-2">Risk flags</h4>
                  <div className="space-y-1">
                    {(summary.riskFlags?.length ?? 0) > 0 ? (
                      <ul className="text-[11px] text-slate-700 list-disc list-inside">
                        {summary.riskFlags.map((f: string, i: number) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[11px] text-slate-500">No specific risk flags identified.</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <h4 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 mb-2">Suggested next steps</h4>
                <ol className="text-[11px] text-slate-700 list-decimal list-inside space-y-1">
                  {summary.suggestedNextSteps.map((s: string, i: number) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-6 text-slate-500">
              <FileText className="h-6 w-6 text-slate-300" />
              <p className="text-[11px]">No summary generated yet.</p>
              <button
                onClick={() => handleGenerate("summary")}
                className="text-xs font-medium text-brand-600 hover:underline"
              >
                Generate case summary
              </button>
            </div>
          )}
        </div>
      )}

      {/* Classification result */}
      {activeTab === "classification" && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          {isLoading ? (
            <div className="space-y-2.5" aria-busy="true">
              <div className="flex gap-2">
                <div className="h-6 w-40 animate-pulse rounded-lg bg-slate-200/70" />
                <div className="h-6 w-28 animate-pulse rounded-lg bg-slate-200/70" />
                <div className="h-6 w-16 animate-pulse rounded-lg bg-slate-200/70" />
              </div>
              <div className="h-16 w-full animate-pulse rounded-xl bg-slate-200/50" />
              <p className="text-[11px] text-slate-400">Classifying grievance…</p>
            </div>
          ) : classification ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg border border-brand-200 bg-brand-50 px-2 py-1 font-mono text-[10px] font-bold text-brand-700">
                  {classification.suggestedCategory}
                </span>
                <span className="rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 font-mono text-[10px] font-bold text-sky-700">
                  {classification.suggestedBureau.replaceAll("_", " ")}
                </span>
                <span
                  className={cn(
                    "rounded-lg border px-2 py-1 font-mono text-[10px] font-bold",
                    classification.suggestedPriority === "CRITICAL"
                      ? "border-rose-200 bg-rose-50 text-rose-700"
                      : classification.suggestedPriority === "HIGH"
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : classification.suggestedPriority === "MEDIUM"
                          ? "border-blue-200 bg-blue-50 text-blue-700"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700"
                  )}
                >
                  {classification.suggestedPriority}
                </span>
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] font-bold",
                    classification.confidence === "HIGH"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : classification.confidence === "MEDIUM"
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : "border-rose-200 bg-rose-50 text-rose-700"
                  )}
                >
                  Confidence: {classification.confidence}
                </span>
                </div>
                <button
                  onClick={() => handleGenerate("classification")}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10.5px] font-bold text-slate-600 hover:bg-slate-50"
                >
                  <RefreshCw className="h-3 w-3" />
                  Regenerate
                </button>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <h4 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 mb-2">Reasoning</h4>
                <p className="text-[11px] leading-relaxed text-slate-700 whitespace-pre-wrap">
                  {classification.reasoning}
                </p>
              </div>
              {classification.categoryAlternatives?.length && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <h4 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 mb-2">Alternative categories</h4>
                  <ul className="space-y-1 text-[11px] text-slate-700 list-disc list-inside">
                    {classification.categoryAlternatives.map((a: any, i: number) => (
                      <li key={i}>
                        <span className="font-medium">{a.category}</span>{" — "}
                        {a.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-6 text-slate-500">
              <Target className="h-6 w-6 text-slate-300" />
              <p className="text-[11px]">No classification suggested yet.</p>
              <button
                onClick={() => handleGenerate("classification")}
                className="text-xs font-medium text-brand-600 hover:underline"
              >
                Suggest category & bureau
              </button>
            </div>
          )}
        </div>
      )}

      {/* Reply draft result */}
      {activeTab === "reply" && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap gap-2 mb-3">
            <label className="text-[10.5px] font-semibold text-slate-700">Reply type</label>
            {REPLY_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setReplyType(t.value)}
                className={cn(
                  "rounded-lg border px-2.5 py-1 text-[10.5px] font-medium transition-colors",
                  replyType === t.value
                    ? "border-brand-300 bg-brand-50 text-brand-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-brand-200"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 mb-3">
            <label className="text-[10.5px] font-semibold text-slate-700">Language</label>
            <select
              value={replyLanguage}
              onChange={(e) => setReplyLanguage(e.target.value as any)}
              className="input input-sm text-[10.5px] min-w-[120px] border-slate-300"
            >
              {Object.entries(LANGUAGE_BADGE).map(([code, badge]) => (
                <option key={code} value={code}>
                  {badge.label} — {code.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {isLoading ? (
            <div className="space-y-2.5" aria-busy="true">
              <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200/70" />
              <div className="h-24 w-full animate-pulse rounded-xl bg-slate-200/50" />
              <p className="text-[11px] text-slate-400">Drafting reply…</p>
            </div>
          ) : reply ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-slate-800">Draft reply</h3>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  {reply.language.toUpperCase()}
                </span>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[10.5px] font-bold text-slate-700 mb-1">{reply.subject}</p>
                <p className="text-[11px] leading-relaxed text-slate-700 whitespace-pre-wrap">
                  {reply.body}
                </p>
                {reply.notes && (
                  <p className="mt-2 text-[10px] italic text-slate-500">{reply.notes}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyText(`Subject: ${reply.subject}\n\n${reply.body}`)}
                  className="flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1.5 text-[10.5px] font-bold text-brand-700 hover:bg-brand-100"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy draft
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-6 text-slate-500">
              <Mail className="h-6 w-6 text-slate-300" />
              <p className="text-[11px]">No reply drafted yet.</p>
              <button
                onClick={() => handleGenerate("reply")}
                className="text-xs font-medium text-brand-600 hover:underline"
              >
                Draft reply to complainant
              </button>
            </div>
          )}
        </div>
      )}

      {/* Translate result */}
      {activeTab === "translate" && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-[10.5px] font-semibold text-slate-700 block mb-1">From</label>
              <select
                value={translateFrom}
                onChange={(e) => setTranslateFrom(e.target.value as any)}
                className="input input-sm text-[10.5px] border-slate-300"
              >
                {Object.entries(LANGUAGE_BADGE).map(([code]) => (
                  <option key={code} value={code}>
                    {code.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10.5px] font-semibold text-slate-700 block mb-1">To</label>
              <select
                value={translateTo}
                onChange={(e) => setTranslateTo(e.target.value as any)}
                className="input input-sm text-[10.5px] border-slate-300"
              >
                {Object.entries(LANGUAGE_BADGE).map(([code]) => (
                  <option key={code} value={code}>
                    {code.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mb-3">
            <label className="text-[10.5px] font-semibold text-slate-700 block mb-1">Text to translate</label>
            <textarea
              value={translateInput}
              onChange={(e) => setTranslateInput(e.target.value)}
              rows={3}
              className="input input-sm text-[10.5px] h-24"
              placeholder="Paste text to translate…"
            />
          </div>

          {isLoading ? (
            <div className="space-y-2.5" aria-busy="true">
              <div className="h-16 w-full animate-pulse rounded-xl bg-slate-200/50" />
              <p className="text-[11px] text-slate-400">Translating…</p>
            </div>
          ) : translation ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <h4 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 mb-2">Translation</h4>
              <p className="text-[11px] leading-relaxed text-slate-700 whitespace-pre-wrap">
                {translation.translatedText}
              </p>
              {translation.notes && (
                <p className="mt-2 text-[10px] italic text-slate-500">{translation.notes}</p>
              )}
              <button
                onClick={() => copyText(translation.translatedText)}
                className="mt-2 flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:underline"
              >
                <Copy className="h-3 w-3" />
                Copy translation
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-6 text-slate-500">
              <Languages className="h-6 w-6 text-slate-300" />
              <p className="text-[11px]">No translation yet.</p>
              <button
                onClick={() => handleGenerate("translate")}
                className="text-xs font-medium text-brand-600 hover:underline"
              >
                Translate text
              </button>
            </div>
          )}
        </div>
      )}

      {/* Overlap explanation */}
      {activeTab === "overlap" && overlapAlert && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <ShieldIcon className="h-4 w-4 text-rose-600" />
            <h3 className="font-semibold text-sm text-rose-900">AI overlap explanation</h3>
          </div>
          {isLoading ? (
            <div className="flex items-center gap-2 text-[11px] text-rose-600 animate-pulse">
              <span className="h-3 w-3 rounded-full bg-rose-200 animate-pulse" /> Explaining overlap…
            </div>
          ) : overlapExplanation ? (
            <div className="space-y-3">
              <p className="text-[11px] leading-relaxed text-rose-800 whitespace-pre-wrap">
                {overlapExplanation.plainExplanation}
              </p>
              <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3">
                <h4 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-rose-700 mb-2">Shared elements</h4>
                <ul className="text-[11px] text-rose-800 list-disc list-inside space-y-1">
                  {overlapExplanation.sharedElements.map((s: string, i: number) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-rose-200 bg-white p-3">
                <h4 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-rose-700 mb-2">Coordination recommendation</h4>
                <p className="text-[11px] leading-relaxed text-rose-800 whitespace-pre-wrap">
                  {overlapExplanation.coordinationRecommendation}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-6 text-rose-600">
              <ShieldIcon className="h-6 w-6 text-rose-300" />
              <p className="text-[11px]">No explanation yet.</p>
              <button
                onClick={() => handleGenerate("overlap")}
                className="text-xs font-medium text-rose-600 hover:underline"
              >
                Explain overlap with AI
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ShieldIcon({ className }: { className: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  );
}
