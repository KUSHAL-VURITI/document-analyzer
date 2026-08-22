"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useDocumentStore } from "@/lib/store";
import { Pipeline } from "@/components/workspace/Pipeline";
import { runClientOCR } from "@/lib/extract/ocr";
import { AiPanel } from "@/components/workspace/AiPanel";
import { DocumentViewer } from "@/components/workspace/DocumentViewer";

export function Workspace() {
  const searchParams = useSearchParams();
  const { file, status, setStatus, setExtractedText, setErrorMessage } = useDocumentStore();
  const isDemo = searchParams.get("demo") === "true";
  const processedFileRef = useRef<File | string | null>(null);

  useEffect(() => {
    if (file && status === 'idle' && processedFileRef.current !== file) {
      processedFileRef.current = file;
      
      const processDocument = async () => {
        try {
          setStatus('uploading');
          await new Promise(r => setTimeout(r, 600));
          
          setStatus('extracting');
          
          const formData = new FormData();
          formData.append('file', file);
          
          const res = await fetch('/api/extract', {
            method: 'POST',
            body: formData
          });
          
          if (!res.ok) throw new Error("Failed to communicate with extraction server.");
          
          const data = await res.json();
          let finalExtractedText = "";
          
          if (data.status === 'requires_ocr') {
            setStatus('ocr');
            try {
              finalExtractedText = await runClientOCR(file);
            } catch (ocrError: any) {
              console.error("OCR Error:", ocrError);
              throw new Error("We couldn't extract readable text from this document. The image may be too complex or blurry.");
            }
          } else if (data.status === 'success') {
            finalExtractedText = data.text;
          } else {
            throw new Error(data.error || "Unknown extraction error.");
          }
          
          if (!finalExtractedText || finalExtractedText.trim().length === 0) {
            throw new Error("We couldn't extract readable text from this document.");
          }
          
          setExtractedText(finalExtractedText);
          
          setStatus('analyzing');
          const summaryRes = await fetch('/api/summarize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: finalExtractedText, mode: 'medium' })
          });
          
          if (!summaryRes.ok) throw new Error("Failed to generate summary.");
          
          setStatus('summarizing');
          const summaryData = await summaryRes.json();
          if (summaryData.error) throw new Error(summaryData.error);
          
          useDocumentStore.getState().setSummaryData(summaryData);
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
        summary: "This document discusses various financial metrics and strategic initiatives for Q4. It highlights a 15% increase in revenue compared to the previous quarter, driven largely by the enterprise segment.",
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

  return (
    <main className="flex h-screen w-full overflow-hidden bg-background animate-in fade-in duration-500">
      {/* Document Viewer — left */}
      <section className="flex-1 bg-card relative z-10 border-r border-[var(--border)]">
        <DocumentViewer />
      </section>

      {/* AI Panel — right */}
      <section className="w-[420px] lg:w-[480px] shrink-0 bg-background flex flex-col relative z-20">
        <AiPanel />
      </section>
    </main>
  );
}
