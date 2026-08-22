"use client";

import { useDocumentStore } from "@/lib/store";
import { FileText, ScanText, Brain, Sparkles, CheckCircle2, AlertTriangle, Loader2, RotateCcw, Upload } from "lucide-react";

export function Pipeline() {
  const { status, errorMessage } = useDocumentStore();

  const stages = [
    { id: 'uploading', label: 'Uploading', description: 'Sending your document to the server...', icon: FileText },
    { id: 'extracting', label: 'Extracting Text', description: 'Parsing text from your PDF...', icon: ScanText },
    { id: 'ocr', label: 'Running OCR', description: 'Recognizing characters from scanned pages — this may take a minute...', icon: ScanText },
    { id: 'analyzing', label: 'Analyzing', description: 'Sending extracted text to AI for analysis...', icon: Brain },
    { id: 'summarizing', label: 'Summarizing', description: 'Generating structured summary and key points...', icon: Sparkles },
  ];

  const getActiveStageIndex = () => stages.findIndex(s => s.id === status);
  const activeIndex = getActiveStageIndex();

  // ─── Error State ───
  if (status === 'error') {
    const isApiError = errorMessage?.toLowerCase().includes('summary') || errorMessage?.toLowerCase().includes('server');
    const isOcrError = errorMessage?.toLowerCase().includes('ocr') || errorMessage?.toLowerCase().includes('text');

    return (
      <div className="flex flex-col items-center justify-center p-8 md:p-12 max-w-md mx-auto animate-in fade-in zoom-in-95 duration-500">
        <div className="w-full bg-card border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
          {/* Error header */}
          <div className="bg-[var(--caution-soft)] px-6 py-5 border-b border-[var(--caution)]/10">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-[var(--caution)]/10 text-[var(--caution)] flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-[family-name:var(--font-heading)] text-lg font-medium text-foreground">
                  Processing Failed
                </h2>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  {isApiError
                    ? "The AI service couldn't generate a summary. This is usually a temporary issue."
                    : isOcrError
                    ? "We couldn't extract readable text from this document. The file may be corrupted or contain only complex graphics."
                    : "Something went wrong while processing your document."}
                </p>
              </div>
            </div>
          </div>

          {/* Error detail */}
          <div className="px-6 py-4 space-y-4">
            {errorMessage && (
              <details className="group">
                <summary className="text-xs font-mono text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none">
                  Technical details ▸
                </summary>
                <div className="mt-2 p-3 rounded-lg bg-[var(--muted)] text-xs font-mono text-muted-foreground leading-relaxed break-all">
                  {errorMessage}
                </div>
              </details>
            )}

            {/* Recovery actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  const store = useDocumentStore.getState();
                  if (store.file) {
                    store.setFile(store.file); // Re-triggers processing
                  } else {
                    window.location.href = '/';
                  }
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-[var(--annotation)] text-[var(--accent-foreground)] hover:bg-[var(--annotation)]/90 active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-[var(--annotation)] focus:ring-offset-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Retry
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-[var(--border)] bg-card text-foreground hover:bg-[var(--muted)] active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-[var(--border)] focus:ring-offset-2"
              >
                <Upload className="w-3.5 h-3.5" />
                New Document
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Processing Stepper ───
  return (
    <div className="flex flex-col items-center justify-center w-full max-w-sm mx-auto p-8 space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="font-[family-name:var(--font-heading)] text-2xl font-medium text-foreground">
          Analyzing your document
        </h2>
        <p className="text-sm text-muted-foreground">
          {activeIndex >= 0 && activeIndex < stages.length 
            ? stages[activeIndex].description 
            : 'Starting...'}
        </p>
      </div>

      {/* Vertical stepper */}
      <div className="w-full">
        <div className="space-y-0">
          {stages.map((stage, index) => {
            const Icon = stage.icon;
            const isCompleted = index < activeIndex || status === 'done';
            const isActive = index === activeIndex;
            const isPending = index > activeIndex && status !== 'done';

            // Skip OCR stage if it wasn't triggered
            if (stage.id === 'ocr' && status !== 'ocr' && !isCompleted) return null;

            const showConnector = index < stages.length - 1;

            return (
              <div key={stage.id} className="relative">
                {/* Step row */}
                <div className={`flex items-center gap-4 py-3 transition-all duration-300 ${
                  isPending ? 'opacity-35' : 'opacity-100'
                }`}>
                  {/* Circle */}
                  <div className={`relative w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 ${
                    isActive 
                      ? 'bg-[var(--annotation)] text-[var(--accent-foreground)] pipeline-active' 
                      : isCompleted 
                      ? 'bg-[var(--success)] text-[var(--accent-foreground)]' 
                      : 'bg-[var(--muted)] text-muted-foreground border border-[var(--border)]'
                  }`}>
                    {isActive ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isCompleted ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>
                  
                  {/* Label */}
                  <span className={`text-sm font-medium transition-colors ${
                    isActive ? 'text-foreground' : isCompleted ? 'text-[var(--success)]' : 'text-muted-foreground'
                  }`}>
                    {stage.label}
                  </span>
                </div>

                {/* Connector line */}
                {showConnector && (
                  <div className="absolute left-[17px] top-[36px] w-[2px] h-[24px] bg-[var(--border)]/60 overflow-hidden">
                    <div 
                      className={`w-full h-full origin-top transition-transform duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                        isCompleted 
                          ? 'bg-[var(--success)] scale-y-100' 
                          : isActive 
                          ? 'bg-[var(--annotation)] scale-y-[0.5] stepper-fill' 
                          : 'scale-y-0'
                      }`} 
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
