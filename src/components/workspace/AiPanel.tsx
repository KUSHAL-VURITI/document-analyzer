"use client";

import ReactMarkdown from 'react-markdown';
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useDocumentStore } from "@/lib/store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Sparkles, 
  List, 
  MessagesSquare, 
  FileText, 
  Hash, 
  Calendar, 
  ArrowRight,
  Plus
} from "lucide-react";
import { ChatTab } from "./ChatTab";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { fetchDocumentSummary } from "@/lib/ai/client";

export function AiPanel() {
  const { summaryData, summaryMode, extractedText, file, setFile } = useDocumentStore();
  const [isRegenerating, setIsRegenerating] = useState(false);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : "");
  const isDemo = searchParams.get("demo") === "true";

  if (!summaryData) return null;

  const summaryWordCount = summaryData?.summary ? summaryData.summary.split(/\s+/).filter(Boolean).length : 0;
  const pages = extractedText ? extractedText.split('---PAGE_BREAK---').map(p => p.trim()).filter(Boolean).length : 0;
  const readingTimeMin = Math.max(1, Math.ceil(summaryWordCount / 200));

  const dateRegex = /\b(19|20)\d{2}\b/g;
  const dates = extractedText ? Array.from(new Set(extractedText.match(dateRegex) || [])).slice(0, 5) : [];

  const handleNewDocumentClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (isDemo) {
        router.replace('/');
      }
      setFile(selectedFile);
    }
    e.target.value = '';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Hidden file input for direct file upload flow */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Document metadata header */}
      <div className="px-4 sm:px-5 pt-5 pb-4 border-b border-[var(--border)] shrink-0 flex justify-between items-start gap-4">
        <div className="flex items-center gap-3 w-full min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[var(--annotation-soft)] flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-[var(--annotation)]" />
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-medium truncate text-foreground" title={file?.name}>
                {isDemo ? "Q4_Financial_Report.pdf" : file?.name || "Document"}
              </h2>
              <span className="shrink-0 rounded-md bg-[var(--muted)] px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                {summaryData.documentType}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
              <span>{pages} {pages === 1 ? 'page' : 'pages'}</span>
            </div>
          </div>
        </div>

        {/* Actions: Theme Toggle & Standout Prominent New Document Button */}
        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />
          <button
            onClick={handleNewDocumentClick}
            className="shrink-0 inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 text-xs font-semibold rounded-lg bg-[var(--annotation)] text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)] active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-[var(--annotation)] focus:ring-offset-1 cursor-pointer shadow-sm hover:shadow-md"
            title="Upload a new document directly"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden sm:inline">New Document</span>
            <span className="sm:hidden">Upload</span>
          </button>
        </div>
      </div>

      <Tabs defaultValue="summary" className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Tab bar — underline style (Summary, Key Points, Ask) */}
        <div className="px-4 sm:px-5 shrink-0 border-b border-[var(--border)]">
          <TabsList className="w-full bg-transparent p-0 h-11 rounded-none gap-0 shadow-none border-none">
            {[
              { value: "summary", icon: Sparkles, label: "Summary" },
              { value: "keypoints", icon: List, label: "Key Points" },
              { value: "ask", icon: MessagesSquare, label: "Ask" },
            ].map(({ value, icon: Icon, label }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--annotation)] data-[state=active]:text-[var(--annotation)] data-[state=active]:bg-transparent data-[state=active]:shadow-none text-muted-foreground hover:text-foreground text-xs font-medium gap-1.5 py-2.5 transition-all cursor-pointer active:scale-95 duration-200"
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          {/* Merged Summary Tab with Integrated Insights */}
          <TabsContent value="summary" className="m-0 p-4 sm:p-5 space-y-4 h-full focus-visible:outline-none focus-visible:ring-0 animate-in fade-in slide-in-from-right-3 duration-300">
            {/* Integrated Insights: Metric Cards */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col p-2.5 bg-card border border-[var(--border)] rounded-lg shadow-sm hover-lift transition-smooth">
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Sparkles className="w-3 h-3 text-[var(--annotation)]" />
                  <span>Summary</span>
                </div>
                <span className="text-sm font-semibold font-mono text-foreground mt-0.5">
                  {summaryWordCount.toLocaleString()} <span className="text-[10px] font-normal text-muted-foreground font-sans">words</span>
                </span>
              </div>

              <div className="flex flex-col p-2.5 bg-card border border-[var(--border)] rounded-lg shadow-sm hover-lift transition-smooth">
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <FileText className="w-3 h-3" />
                  <span>Pages</span>
                </div>
                <span className="text-sm font-semibold font-mono text-foreground mt-0.5">
                  {pages}
                </span>
              </div>
            </div>

            {/* Detected years if available */}
            {dates.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-card border border-[var(--border)] rounded-lg text-xs shadow-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground shrink-0">
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="font-medium">Detected Years:</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {dates.map((d) => (
                    <span key={d} className="px-2 py-0.5 bg-[var(--muted)] border border-[var(--border)] rounded-md text-[11px] font-mono text-foreground">
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Length controls — segmented control */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-medium text-muted-foreground">Summary Length</span>
              <div className="flex items-center gap-1 p-1 bg-[var(--muted)] rounded-lg">
                {['short', 'medium', 'long'].map((mode) => {
                  const targetMode = mode as 'short' | 'medium' | 'long';
                  return (
                    <button 
                      key={mode}
                      onClick={async () => {
                        if (isRegenerating || mode === summaryMode) return;
                        
                        const store = useDocumentStore.getState();
                        
                        // Instant 0ms switch if already in client cache
                        if (store.summaryCache[targetMode]) {
                          store.setSummaryMode(targetMode);
                          store.setSummaryData(store.summaryCache[targetMode]!);
                          return;
                        }

                        if (isDemo) {
                          const demoSummaries = {
                            short: {
                              summary: "The Q4 Financial Report highlights strong performance led by a 15% revenue expansion in the enterprise segment. Operating expenses were reduced by 2%, contributing to increased profitability.",
                              keyPoints: [
                                "15% revenue increase driven by enterprise segment",
                                "Operating expenses decreased by 2%"
                              ],
                              documentType: "Financial Report"
                            },
                            medium: {
                              summary: "This document discusses various financial metrics and strategic initiatives for Q4. It highlights a 15% increase in revenue compared to the previous quarter, driven largely by the enterprise segment.\n\nOperating costs decreased by 2% across infrastructure and administrative channels, improving gross margins and positioning the company favorably for sustained growth.",
                              keyPoints: [
                                "Q4 revenue increased by 15%",
                                "Enterprise segment is the primary growth driver",
                                "Operating costs decreased by 2%"
                              ],
                              documentType: "Financial Report"
                            },
                            long: {
                              summary: "The Q4 Financial Report presents an in-depth financial analysis detailing core growth drivers, cost optimizations, and capital allocations across all operational segments.\n\nTotal revenue demonstrated a 15% year-over-year expansion, catalyzed primarily by high-ticket enterprise contracts and accelerated digital adoption. Customer retention remained above 94%, with net revenue retention tracking at 118%.\n\nOn the expenditure side, operational overhead dropped by 2%, driven by automated workflow deployments and vendor consolidation. Net profit margins widened by 320 basis points, ensuring robust liquidity for upcoming strategic initiatives.",
                              keyPoints: [
                                "Q4 revenue grew 15% year-over-year fueled by enterprise sales",
                                "Operating expenses reduced by 2% through workflow automation",
                                "Net profit margins expanded by 320 basis points",
                                "Customer retention remained exceptionally strong at 94%"
                              ],
                              documentType: "Financial Report"
                            }
                          };
                          const selected = demoSummaries[targetMode];
                          store.setCachedSummary(targetMode, selected);
                          store.setSummaryMode(targetMode);
                          store.setSummaryData(selected);
                          return;
                        }

                        setIsRegenerating(true);
                        try {
                          const text = store.extractedText;
                          if (!text) return;
                          await fetchDocumentSummary(text, targetMode);
                        } catch (e: any) {
                          console.error("Failed to regenerate summary:", e);
                          alert(e.message || "Failed to regenerate summary. Please check your network connection.");
                        } finally {
                          setIsRegenerating(false);
                        }
                      }}
                      disabled={isRegenerating}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all duration-150 cursor-pointer ${
                        summaryMode === mode 
                          ? 'bg-card text-foreground shadow-sm font-semibold' 
                          : 'text-muted-foreground hover:text-foreground active:scale-95'
                      } ${isRegenerating && summaryMode === mode ? 'opacity-70' : ''}`}
                    >
                      {isRegenerating && summaryMode === mode ? '...' : mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Summary text */}
            <div className="bg-card border border-[var(--border)] rounded-xl p-4 sm:p-5 text-sm leading-relaxed text-foreground [&>p]:mb-3 last:[&>p]:mb-0 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-3 [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:mb-3 [&_strong]:font-semibold shadow-sm hover:border-[var(--annotation)]/20 transition-all duration-300">
              <ReactMarkdown>{summaryData.summary}</ReactMarkdown>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-3 mt-3 border-t border-[var(--border)]">
                <span>{summaryWordCount} words</span>
                <span>~{readingTimeMin} min read</span>
              </div>
            </div>

            {/* Document suggestion card */}
            <div className="p-3.5 bg-[var(--annotation-soft)] rounded-xl border border-[var(--annotation)]/10">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-md bg-[var(--annotation)]/10 flex items-center justify-center shrink-0 mt-0.5">
                  <ArrowRight className="w-3 h-3 text-[var(--annotation)]" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-[var(--annotation)] mb-0.5 uppercase tracking-wider">Insight Suggestion</p>
                  <p className="text-xs text-foreground leading-relaxed">
                    {summaryData.documentType.toLowerCase().includes("resume") 
                      ? "This resume could be strengthened by quantifying achievements with specific metrics." 
                      : summaryData.documentType.toLowerCase().includes("report")
                      ? "Consider adding an executive summary section at the beginning of this report for faster consumption."
                      : "Breaking this document into clearer hierarchical headings would improve readability."}
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Key Points tab */}
          <TabsContent value="keypoints" className="m-0 p-5 space-y-3 h-full focus-visible:outline-none focus-visible:ring-0 animate-in fade-in slide-in-from-right-3 duration-300">
            {summaryData.keyPoints.map((point, i) => (
              <div 
                key={i} 
                style={{ animationDelay: `${i * 80}ms` }}
                className="flex gap-0 bg-card border border-[var(--border)] rounded-xl overflow-hidden hover:border-[var(--annotation)]/30 transition-all duration-300 shadow-sm hover-lift cascade-item"
              >
                {/* Color accent bar */}
                <div className="w-1 shrink-0 bg-[var(--annotation)]" />
                <div className="flex items-start gap-3 px-4 py-3.5">
                  <span className="text-[11px] font-mono text-[var(--annotation)] font-bold mt-0.5 shrink-0">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="text-sm leading-relaxed text-foreground [&>p]:mb-0 [&_strong]:font-semibold">
                    <ReactMarkdown>{point}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          {/* Chat tab */}
          <TabsContent value="ask" className="m-0 p-5 h-full focus-visible:outline-none focus-visible:ring-0 animate-in fade-in slide-in-from-right-3 duration-300">
            <ChatTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
