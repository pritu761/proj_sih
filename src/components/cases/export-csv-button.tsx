"use client";

import { Download } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export function ExportCsvButton({
  href,
  label = "Export CSV",
  filename = "aicte_cases_export.csv",
}: {
  href: string;
  label?: string;
  filename?: string;
}) {
  const toast = useToast();

  return (
    <a
      href={href}
      download={filename}
      className="btn btn-secondary"
      onClick={() =>
        toast.success("Preparing export", "Your CSV register will download automatically.")
      }
    >
      <Download className="h-3.5 w-3.5" />
      {label}
    </a>
  );
}
