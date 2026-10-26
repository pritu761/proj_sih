"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PlusCircle, AlertTriangle, ArrowRight } from "lucide-react";
import { createCaseAction } from "@/actions/case-actions";
import { SLA_CONFIGS } from "@/lib/demo-data";

export default function NewCasePage() {
  const router = useRouter();

  const [institutions, setInstitutions] = useState<any[]>([]);
  const [selectedInstId, setSelectedInstId] = useState("");
  const [source, setSource] = useState<any>("student");
  const [category, setCategory] = useState(SLA_CONFIGS[2].category); // Capitation Fee default
  const [assignedBureau, setAssignedBureau] = useState<any>("REGULATION_BUREAU");
  const [priority, setPriority] = useState<any>("HIGH");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetch("/api/institutions/list")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setInstitutions(data);
          if (data.length > 0) setSelectedInstId(data[0].aicte_permanent_id);
        }
      })
      .catch((err) => console.debug("Institution list fetch tick.", err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstId) {
      setErrorMsg("Please select an institution.");
      return;
    }
    if (description.length < 15) {
      setErrorMsg("Description must be at least 15 characters long.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const res = await createCaseAction({
        aicte_permanent_id: selectedInstId,
        source,
        category,
        description,
        assigned_bureau: assignedBureau,
        priority,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to create case.");
        setIsSubmitting(false);
      } else {
        router.push(`/cases/${res.caseId}`);
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Case registration failed.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/cases" className="hover:text-blue-900 font-medium">
          Case Explorer
        </Link>
        <span>/</span>
        <span className="font-semibold text-slate-900">Register New Grievance</span>
      </nav>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
        <div className="border-b border-slate-100 pb-4 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-900 text-white shadow-xs">
              <PlusCircle className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Register New Institutional Complaint
              </h1>
              <p className="text-xs text-slate-500">
                AICTE Cross-Bureau Overlap Engine automatically evaluates this submission for duplicate or parallel jurisdiction cases.
              </p>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6 flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Institution Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Select Institution *
            </label>
            <select
              value={selectedInstId}
              onChange={(e) => setSelectedInstId(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs font-medium text-slate-900 focus:border-blue-700 focus:outline-hidden"
            >
              {institutions.length === 0 ? (
                <option value="1-1029384751">Apex Institute of Engineering & Technology (1-1029384751)</option>
              ) : (
                institutions.map((i) => (
                  <option key={i.id} value={i.aicte_permanent_id}>
                    {i.name} — {i.city}, {i.state} (ID: {i.aicte_permanent_id})
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Bureau */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Allocating Bureau/Cell *
              </label>
              <select
                value={assignedBureau}
                onChange={(e) => setAssignedBureau(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-xs font-medium text-slate-900 focus:border-blue-700 focus:outline-hidden"
              >
                <option value="REGULATION_BUREAU">Regulation Bureau (RB)</option>
                <option value="PGRC">Public Grievance Redressal Cell (PGRC)</option>
                <option value="APPROVAL_BUREAU">Approval Bureau (AB)</option>
                <option value="SKILL_CELL">Skill Development Cell (SDC)</option>
              </select>
            </div>

            {/* Source */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Grievance Source *
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-xs font-medium text-slate-900 focus:border-blue-700 focus:outline-hidden"
              >
                <option value="student">Student / Parent</option>
                <option value="faculty">Faculty / Staff</option>
                <option value="stakeholder">Institution Stakeholder / Trust</option>
                <option value="public">General Public / Suo-Motu</option>
                <option value="other">Government / Legal Referral</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Complaint Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-xs font-medium text-slate-900 focus:border-blue-700 focus:outline-hidden"
              >
                {SLA_CONFIGS.map((c) => (
                  <option key={c.category} value={c.category}>
                    {c.category} (SLA: {c.timeline_days} days)
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Initial Priority *
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-xs font-medium text-slate-900 focus:border-blue-700 focus:outline-hidden"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical (Immediate EVC / Hearing)</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Grievance Representation & Factual Particulars * (min 15 chars)
            </label>
            <textarea
              rows={5}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detail the alleged violations, affected semesters, fee amounts, or non-compliance observed..."
              className="w-full rounded-lg border border-slate-300 p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-hidden leading-relaxed"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <Link
              href="/cases"
              className="text-xs text-slate-500 hover:text-slate-900 font-semibold"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={isSubmitting || description.length < 15}
              className="flex items-center gap-2 rounded-lg bg-blue-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-800 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? "Scanning Overlaps & Registering..." : "Submit Grievance to Registry"}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
