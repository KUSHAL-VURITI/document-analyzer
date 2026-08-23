"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useDocumentStore } from "@/lib/store";
import { Pipeline } from "@/components/workspace/Pipeline";
import { runClientOCR } from "@/lib/extract/ocr";
import { AiPanel } from "@/components/workspace/AiPanel";
import { DocumentViewer } from "@/components/workspace/DocumentViewer";
import { extractPdfTextClient } from "@/lib/extract/clientExtract";
import { fetchDocumentSummary } from "@/lib/ai/client";
import { FileText, Sparkles, Eye, Bot } from "lucide-react";

export function Workspace() {
  const searchParams = useSearchParams();
  const { file, status, setStatus, setExtractedText, setErrorMessage } = useDocumentStore();
  const isDemo = searchParams.get("demo") === "true";
  const processedFileRef = useRef<File | string | null>(null);
  const [mobileTab, setMobileTab] = useState<'viewer' | 'ai'>('ai');

  // Automatically switch to document view on mobile when a citation is clicked
  useEffect(() => {
    const handleCitation = () => {
      setMobileTab('viewer');
    };
    window.addEventListener("citation-click", handleCitation);
    return () => window.removeEventListener("citation-click", handleCitation);
  }, []);

  useEffect(() => {
    if (file && status === 'idle' && processedFileRef.current !== file) {
      processedFileRef.current = file;
      
      const processDocument = async () => {
        try {
          setStatus('uploading');
          await new Promise(r => setTimeout(r, 400));
          
          setStatus('extracting');
          let finalExtractedText = "";

          if (file.type.startsWith("image/")) {
            setStatus('ocr');
            try {
              finalExtractedText = await runClientOCR(file);
            } catch (ocrError: any) {
              console.error("OCR Error:", ocrError);
              throw new Error("We couldn't extract readable text from this image.");
            }
          } else {
            // PDF document: try server extraction first, then fallback to in-browser parsing
            try {
              const formData = new FormData();
              formData.append('file', file);
              
              const res = await fetch('/api/extract', {
                method: 'POST',
                body: formData
              });
              
              if (res.ok) {
                const data = await res.json();
                if (data.status === 'success' && data.text) {
                  finalExtractedText = data.text;
                } else if (data.status === 'requires_ocr') {
                  setStatus('ocr');
                  finalExtractedText = await runClientOCR(file);
                }
              }
            } catch (serverErr) {
              console.warn("Server extraction unavailable, falling back to client-side extraction:", serverErr);
            }

            // In-browser PDF extraction fallback (ensures 100% reliability on Vercel/production)
            if (!finalExtractedText || finalExtractedText.trim().length === 0) {
              try {
                const clientResult = await extractPdfTextClient(file);
                if (clientResult.isScanned) {
                  setStatus('ocr');
                  finalExtractedText = await runClientOCR(file);
                } else {
                  finalExtractedText = clientResult.text;
                }
              } catch (clientErr) {
                console.warn("Direct PDF parsing failed, attempting OCR fallback:", clientErr);
                setStatus('ocr');
                finalExtractedText = await runClientOCR(file);
              }
            }
          }
          
          if (!finalExtractedText || finalExtractedText.trim().length === 0) {
            throw new Error("We couldn't extract readable text from this document.");
          }
          
          setExtractedText(finalExtractedText);
          
          setStatus('analyzing');
          setStatus('summarizing');
          await fetchDocumentSummary(finalExtractedText, 'medium');
          setStatus('done');
          
        } catch (error: any) {
          setErrorMessage(error.message || "An unexpected error occurred.");
        }
      };
      
      processDocument();
    } else if (isDemo && status === 'idle' && processedFileRef.current !== 'demo') {
      processedFileRef.current = 'demo';
      setExtractedText("This is a demo document text loaded instantly.\n\nIt contains information about the Q4 Financial Report, highlighting a 15% revenue increase driven by the enterprise segment. Operating costs decreased by 2%, contributing to a strong margin.");
      
      useDocumentStore.getState().setSummaryData({
        summary: "This document discusses various financial metrics and strategic initiatives for Q4. It highlights a 15% increase in revenue compared to the previous quarter, driven largely by the enterprise segment.\n\nOperating costs decreased by 2% across infrastructure and administrative channels.",
        keyPoints: [
          "Q4 revenue increased by 15%",
          "Enterprise segment is the primary growth driver",
          "Operating costs decreased by 2%"
        ],
        documentType: "Financial Report"
      });
      
      setStatus('done');
    }
  }, [file, isDemo, status, setStatus, setExtractedText, setErrorMessage]);

  if (status !== 'done') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background animate-in fade-in duration-500">
        <Pipeline />
      </main>
    );
  }

  const fileName = isDemo ? "Q4_Financial_Report.pdf" : file?.name || "Document";

  return (
    <main className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-background animate-in fade-in duration-500">
      {/* Mobile Top View Switcher (Visible only on mobile screens < md) */}
      <div className="md:hidden flex items-center justify-between px-3.5 py-2.5 bg-card border-b border-[var(--border)] shrink-0 z-30 shadow-xs">
        <div className="flex items-center gap-2 min-w-0 max-w-[50%]">
          <div className="w-6 h-6 rounded-md bg-[var(--annotation-soft)] flex items-center justify-center shrink-0">
            <FileText className="w-3.5 h-3.5 text-[var(--annotation)]" />
          </div>
          <span className="text-xs font-semibold truncate text-foreground">
            {fileName}
          </span>
        </div>
        
        {/* Mobile Navigation Tabs */}
        <div className="flex items-center p-0.5 bg-[var(--muted)] rounded-lg border border-[var(--border)]">
          <button
            onClick={() => setMobileTab('viewer')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
              mobileTab === 'viewer'
                ? 'bg-card text-foreground shadow-xs font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Document</span>
          </button>
          <button
            onClick={() => setMobileTab('ai')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
              mobileTab === 'ai'
                ? 'bg-card text-[var(--annotation)] shadow-xs font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Insights</span>
          </button>
        </div>
      </div>

      {/* Document Viewer (Left on desktop, toggled on mobile) */}
      <section 
        className={`flex-1 min-w-0 bg-card relative z-10 md:border-r md:border-[var(--border)] h-full overflow-hidden ${
          mobileTab === 'viewer' ? 'flex flex-col' : 'hidden md:flex md:flex-col'
        }`}
      >
        <DocumentViewer />
      </section>

      {/* AI Panel (Right on desktop, toggled on mobile) */}
      <section 
        className={`w-full md:w-[420px] lg:w-[460px] xl:w-[480px] shrink-0 bg-background flex flex-col relative z-20 h-full overflow-hidden ${
          mobileTab === 'ai' ? 'flex flex-col' : 'hidden md:flex md:flex-col'
        }`}
      >
        <AiPanel />
      </section>

      {/* Floating Action Switcher on Mobile */}
      <div className="md:hidden fixed bottom-4 right-4 z-50">
        {mobileTab === 'viewer' ? (
          <button
            onClick={() => setMobileTab('ai')}
            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--annotation)] text-[var(--accent-foreground)] rounded-full shadow-lg font-medium text-xs hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Open AI Panel</span>
          </button>
        ) : (
          <button
            onClick={() => setMobileTab('viewer')}
            className="flex items-center gap-2 px-4 py-2.5 bg-card border border-[var(--border)] text-foreground rounded-full shadow-lg font-medium text-xs hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View Document</span>
          </button>
        )}
      </div>
    </main>
  );
}
