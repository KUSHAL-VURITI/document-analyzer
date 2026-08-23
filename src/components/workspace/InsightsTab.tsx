"use client";

import { useDocumentStore } from "@/lib/store";
import { FileText, Hash, Calendar, Search, ArrowRight } from "lucide-react";

export function InsightsTab() {
  const { summaryData, extractedText, status } = useDocumentStore();

  if (!summaryData || !extractedText) return null;

  const wordCount = extractedText.split(/\s+/).filter(Boolean).length;
  const charCount = extractedText.replace(/\s+/g, '').length;
  const pages = extractedText.split('---PAGE_BREAK---').map(p => p.trim()).filter(Boolean).length;
  
  const dateRegex = /\b(19|20)\d{2}\b/g;
  const dates = Array.from(new Set(extractedText.match(dateRegex) || [])).slice(0, 5);
  
  const ocrUsed = status === 'ocr';

  const metrics = [
    { icon: FileText, label: "Pages", value: pages.toString() },
  ];

  return (
    <div className="flex flex-col h-full space-y-5">
      {/* Compact metric chips */}
      <div className="flex flex-wrap gap-2">
        {metrics.map(({ icon: Icon, label, value }, i) => (
          <div 
            key={label} 
            style={{ animationDelay: `${i * 100}ms` }}
            className="inline-flex items-center gap-2 px-3 py-2 bg-card border border-[var(--border)] rounded-lg hover-lift transition-smooth cursor-default shadow-sm hover:border-[var(--annotation)]/20 cascade-item"
          >
            <Icon className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="text-sm font-medium text-foreground font-mono">{value}</span>
          </div>
        ))}
      </div>

      {/* Extraction method */}
      <div className="bg-card border border-[var(--border)] rounded-xl p-4 shadow-sm hover:border-[var(--annotation)]/20 transition-all duration-300">
        <p className="text-xs font-medium text-muted-foreground mb-2">Extraction Method</p>
        <div className="flex items-center gap-2">
          {ocrUsed ? (
            <>
              <div className="w-2 h-2 rounded-full bg-[var(--warning)] animate-pulse" />
              <span className="text-sm font-medium text-foreground">Optical Character Recognition</span>
              <span className="text-[11px] text-muted-foreground font-mono">(Tesseract.js)</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 rounded-full bg-[var(--success)]" />
              <span className="text-sm font-medium text-foreground">Native PDF Parsing</span>
              <span className="text-[11px] text-muted-foreground font-mono">(unpdf)</span>
            </>
          )}
        </div>
      </div>

      {/* Detected years */}
      {dates.length > 0 && (
        <div className="bg-card border border-[var(--border)] rounded-xl p-4 shadow-sm hover:border-[var(--annotation)]/20 transition-all duration-300">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground">Detected Years</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {dates.map((d, idx) => (
              <span 
                key={d} 
                style={{ animationDelay: `${idx * 60 + 200}ms` }}
                className="px-2.5 py-1 bg-[var(--muted)] rounded-md text-xs font-mono text-foreground border border-[var(--border)] hover-lift cursor-default hover:bg-[var(--annotation-soft)] hover:text-[var(--annotation)] hover:border-[var(--annotation)]/20 cascade-item"
              >
                {d}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1" />

      {/* Suggestion */}
      <div className="p-4 bg-[var(--annotation-soft)] rounded-xl border border-[var(--annotation)]/10">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-md bg-[var(--annotation)]/10 flex items-center justify-center shrink-0 mt-0.5">
            <ArrowRight className="w-3 h-3 text-[var(--annotation)]" />
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--annotation)] mb-1">Suggestion</p>
            <p className="text-sm text-foreground leading-relaxed">
              {summaryData.documentType.toLowerCase().includes("resume") 
                ? "This resume could be strengthened by quantifying achievements with specific metrics." 
                : summaryData.documentType.toLowerCase().includes("report")
                ? "Consider adding an executive summary section at the beginning of this report for faster consumption."
                : "Breaking this document into clearer hierarchical headings would improve readability."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
