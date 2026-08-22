"use client";

import { Suspense } from "react";
import { Uploader } from "@/components/upload/Uploader";
import { useRouter, useSearchParams } from "next/navigation";
import { useDocumentStore } from "@/lib/store";
import { Workspace } from "@/components/workspace/Workspace";
import { FileText, Sparkles, Shield, Zap } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setFile = useDocumentStore((state) => state.setFile);
  const file = useDocumentStore((state) => state.file);
  const isDemo = searchParams.get("demo") === "true";

  const handleFileSelect = (file: File) => {
    setFile(file);
  };

  if (file || isDemo) {
    return <Workspace />;
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center min-h-screen bg-background relative overflow-hidden interactive-bg-grid transition-smooth">
      {/* Top Bar with branding and theme toggle */}
      <header className="absolute top-0 left-0 right-0 h-16 px-6 md:px-12 flex items-center justify-between z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[var(--annotation-soft)] flex items-center justify-center">
            <FileText className="w-4 h-4 text-[var(--annotation)]" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-foreground">
            Document Intelligence
          </span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
        </div>
      </header>

      <div className="w-full flex-1 flex flex-col lg:flex-row items-center justify-center pt-16">
        {/* Dynamic drifting glow blobs */}
        <div className="absolute top-[-10%] right-[-5%] w-[45rem] h-[45rem] rounded-full bg-[var(--annotation)]/[0.03] blur-[120px] pointer-events-none animate-blob" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[35rem] h-[35rem] rounded-full bg-[var(--success)]/[0.02] blur-[100px] pointer-events-none animate-blob animation-delay-4000" />
        <div className="absolute top-[40%] left-[20%] w-[25rem] h-[25rem] rounded-full bg-[var(--caution)]/[0.015] blur-[90px] pointer-events-none animate-blob animation-delay-2000" />

        {/* Left: Copy */}
        <div className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-20 py-12 lg:py-0 max-w-2xl z-10">
          <div className="space-y-8">
            <div className="space-y-5">
              <h1 className="font-[family-name:var(--font-heading)] text-4xl md:text-5xl lg:text-[3.25rem] font-medium tracking-tight text-foreground leading-[1.15]">
                Understand any<br />document, <span className="text-[var(--annotation)]">instantly.</span>
              </h1>
              <p className="text-base md:text-lg text-muted-foreground max-w-lg leading-relaxed">
                Upload a PDF or image. We extract the text, analyze it with AI, and give you a structured summary with page-level citations you can verify.
              </p>
            </div>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-3">
              {[
                { icon: Zap, label: "Hybrid extraction" },
                { icon: Shield, label: "Grounded citations" },
                { icon: Sparkles, label: "AI summaries" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-card border border-[var(--border)] text-sm text-foreground">
                  <Icon className="w-3.5 h-3.5 text-[var(--annotation)]" />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Upload area */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 md:px-16 lg:px-20 py-12 lg:py-0 max-w-xl w-full z-10">
          <div className="w-full space-y-6">
            <Uploader onFileSelect={handleFileSelect} />
          </div>
        </div>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-[var(--annotation)] border-t-transparent rounded-full animate-spin" />
      </main>
    }>
      <HomeContent />
    </Suspense>
  );
}
