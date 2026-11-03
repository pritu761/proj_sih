"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessagesSquare, ShieldCheck, Building2, Send } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { EmptyState } from "@/components/ui/empty-state";
import { addCaseCommentAction } from "@/actions/case-actions";
import { BureauPill } from "@/components/ui/badges";
import { SessionUser } from "@/lib/rbac";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

export interface CaseCommentView {
  id: string;
  case_id: string;
  author_email: string;
  author_name: string;
  author_bureau: string;
  body: string;
  scope: "COORDINATION" | "INTERNAL";
  created_at: Date | string;
}

interface CaseThreadPanelProps {
  caseInternalId: string;
  currentUser: SessionUser;
  initialComments: CaseCommentView[];
  canPostInternal: boolean;
}

const initials = (name: string) =>
  name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "AI";

export function CaseThreadPanel({
  caseInternalId,
  currentUser,
  initialComments,
  canPostInternal,
}: CaseThreadPanelProps) {
  const router = useRouter();
  const toast = useToast();
  const [comments, setComments] = useState<CaseCommentView[]>(initialComments);
  const [body, setBody] = useState("");
  const [scope, setScope] = useState<"COORDINATION" | "INTERNAL">("COORDINATION");
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState("");

  const internalCount = comments.filter((c) => c.scope === "INTERNAL").length;

  const handlePost = async () => {
    if (body.trim().length < 3) return;
    setIsPosting(true);
    setError("");
    const res = await addCaseCommentAction({ caseId: caseInternalId, body, scope });
    setIsPosting(false);

    if (!res.success) {
      setError(res.error || "Failed to post the note.");
      return;
    }

    setBody("");
    // Optimistic: optimistic entry flag from server refresh follows.
    setComments((prev) => [
      ...prev,
      {
        id: `local_${Date.now()}`,
        case_id: "",
        author_email: currentUser.email,
        author_name: currentUser.name,
        author_bureau: currentUser.bureau,
        body,
        scope,
        created_at: new Date(),
      },
    ]);
    toast.success("Note posted to the thread");
    router.refresh();
  };

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h2 className="panel-title flex items-center gap-2">
            <MessagesSquare className="h-3.5 w-3.5 text-brand-600" />
            Inter-bureau coordination thread
          </h2>
        </div>
        <span className="badge border-slate-200 bg-slate-50 text-slate-600">
          {comments.length} notes
          {internalCount > 0 && (
            <span className="ml-1 text-slate-400">(incl. {internalCount} internal)</span>
          )}
        </span>
      </div>

      <div className="px-5 py-4">
        {comments.length === 0 ? (
          <EmptyState compact icon={MessagesSquare} title="No coordination notes yet" />
        ) : (
          <ul className="space-y-3">
            {comments.map((comment) => (
              <li
                key={comment.id}
                className={cn(
                  "rounded-xl border p-3",
                  comment.scope === "INTERNAL"
                    ? "border-amber-200 bg-amber-50/50"
                    : "border-slate-200 bg-white"
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-lg text-[10.5px] font-bold text-white",
                        comment.scope === "INTERNAL"
                          ? "bg-amber-500"
                          : "bg-gradient-to-br from-brand-500 to-brand-700"
                      )}
                      title={comment.author_bureau}
                    >
                      {initials(comment.author_name)}
                    </span>
                    <div>
                      <p className="text-[11px] font-bold leading-tight text-slate-800">
                        {comment.author_name}{" "}
                        {comment.author_email === currentUser.email && (
                          <span className="font-medium text-slate-400">(you)</span>
                        )}
                      </p>
                      <BureauPill bureau={comment.author_bureau} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {comment.scope === "INTERNAL" ? (
                      <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-amber-700">
                        <Building2 className="h-2.5 w-2.5" /> Bureau internal
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md border border-brand-200 bg-brand-50 px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-brand-700">
                        <ShieldCheck className="h-2.5 w-2.5" /> Coordination
                      </span>
                    )}
                    <span className="text-[10.5px] text-slate-400">
                      {formatDateTime(comment.created_at)}
                    </span>
                  </div>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-[11.5px] leading-relaxed text-slate-700">
                  {comment.body}
                </p>
              </li>
            ))}
          </ul>
        )}

        {/* Composer */}
        <div className="mt-4 space-y-2.5 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            {canPostInternal ? (
              <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                {(
                  [
                    { key: "COORDINATION", label: "Coordination · all bureaus" },
                    { key: "INTERNAL", label: "Internal · my bureau" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setScope(opt.key)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-[10.5px] font-bold transition-colors",
                      scope === opt.key
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10.5px] font-semibold text-slate-500">
                <ShieldCheck className="h-2.5 w-2.5" />
                Regional observers post coordination notes only
              </span>
            )}
            {scope === "INTERNAL" && (
              <p className="text-[10.5px] text-slate-400">
                Internal notes stay hidden from other bureaus and the public tracker.
              </p>
            )}
          </div>
          <textarea
            rows={2}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={
              scope === "INTERNAL"
                ? "Desk note for your bureau only…"
                : "Message the colliding bureau (joint minutes, hearing proposals, document requests…)"
            }
            className="input"
          />
          <div className="flex items-center justify-between">
            <p className="text-[10.5px] text-slate-400">
              Notes are appended to the case thread and the audit ledger.
            </p>
            <button
              type="button"
              onClick={handlePost}
              disabled={isPosting || body.trim().length < 3}
              className="btn btn-primary btn-sm"
            >
              <Send className="h-3.5 w-3.5" />
              {isPosting ? "Posting…" : "Post note"}
            </button>
          </div>
          {error && (
            <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-700">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
