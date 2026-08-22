"use client";

import { useEffect, useState, useRef } from "react";
import { useDocumentStore } from "@/lib/store";
import { Search, X, Upload, FileText, Image as ImageIcon, ChevronUp, ChevronDown } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

const PdfRenderer = dynamic(() => import("./PdfRenderer").then(mod => mod.PdfRenderer), { ssr: false });

export function DocumentViewer() {
  const { extractedText, file, reset } = useDocumentStore();
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : "");
  const isDemo = searchParams.get("demo") === "true";
  const router = useRouter();
  
  const [highlightedPage, setHighlightedPage] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [matchesCount, setMatchesCount] = useState(0);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Create image preview URL for image files
  useEffect(() => {
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  const pages = (extractedText || "").split('---PAGE_BREAK---').map(p => p.trim()).filter(Boolean);

  // Reset match index when query changes
  useEffect(() => {
    setCurrentMatchIndex(0);
  }, [searchQuery]);

  const goToNextMatch = () => {
    if (matchesCount === 0) return;
    setCurrentMatchIndex((prev) => (prev + 1) % matchesCount);
  };

  const goToPrevMatch = () => {
    if (matchesCount === 0) return;
    setCurrentMatchIndex((prev) => (prev - 1 + matchesCount) % matchesCount);
  };

  // Citation click handler — smoothly navigates and highlights page in rendered view
  useEffect(() => {
    const handleCitationClick = (e: Event) => {
      const customEvent = e as CustomEvent<{ pages: string }>;
      const firstPage = parseInt(customEvent.detail.pages.split(',')[0].trim());
      
      if (!isNaN(firstPage)) {
        setHighlightedPage(firstPage);
        setTimeout(() => setHighlightedPage(null), 2500);
      }
    };

    window.addEventListener("citation-click", handleCitationClick);
    return () => window.removeEventListener("citation-click", handleCitationClick);
  }, []);

  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  if (!extractedText && !file) return null;

  const fileName = isDemo ? "Q4_Financial_Report.pdf" : file?.name || "Document";
  const isImage = file?.type.startsWith('image/');
  const visualSource = file || (isDemo ? '/sample.pdf' : null);

  return (
    <div className="flex flex-col h-full relative">
      {/* Toolbar */}
      <div className="h-13 border-b border-[var(--border)] flex items-center justify-between px-5 shrink-0 bg-card">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-7 h-7 rounded-md bg-[var(--annotation-soft)] flex items-center justify-center shrink-0">
            {isImage ? (
              <ImageIcon className="w-3.5 h-3.5 text-[var(--annotation)]" />
            ) : (
              <FileText className="w-3.5 h-3.5 text-[var(--annotation)]" />
            )}
          </div>
          <span className="text-sm font-medium text-foreground truncate max-w-[200px] md:max-w-[280px]">
            {fileName}
          </span>
          <span className="text-[11px] font-mono text-muted-foreground px-1.5 py-0.5 rounded bg-[var(--muted)]">
            {pages.length} {pages.length === 1 ? 'page' : 'pages'}
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Search Box */}
          {showSearch ? (
            <div className="flex items-center gap-1.5 bg-[var(--muted)] border border-[var(--border)] rounded-lg px-2.5 py-1 animate-in fade-in slide-in-from-right-2 duration-200">
              <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <input 
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (e.shiftKey) {
                      goToPrevMatch();
                    } else {
                      goToNextMatch();
                    }
                  } else if (e.key === 'Escape') {
                    setShowSearch(false);
                    setSearchQuery("");
                  }
                }}
                placeholder="Search in document..."
                className="bg-transparent border-none focus:outline-none text-xs w-32 md:w-44 placeholder:text-muted-foreground"
              />
              
              {searchQuery.trim().length > 0 && (
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[11px] font-mono text-muted-foreground whitespace-nowrap px-1">
                    {matchesCount > 0 ? `${currentMatchIndex + 1}/${matchesCount}` : "0/0"}
                  </span>

                  <button
                    onClick={goToPrevMatch}
                    disabled={matchesCount === 0}
                    className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card disabled:opacity-30 transition-all cursor-pointer"
                    title="Previous match (Shift+Enter)"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={goToNextMatch}
                    disabled={matchesCount === 0}
                    className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card disabled:opacity-30 transition-all cursor-pointer"
                    title="Next match (Enter)"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <button 
                onClick={() => { setShowSearch(false); setSearchQuery(""); }} 
                className="text-muted-foreground hover:text-foreground transition-colors ml-0.5 cursor-pointer"
                title="Close search (Esc)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              className="w-8 h-8 rounded-lg border border-[var(--border)] bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-[var(--muted)] transition-all cursor-pointer"
              title="Search in document (Ctrl+F)"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Upload new */}
          <button
            onClick={() => {
              reset();
              router.push('/');
            }}
            className="w-8 h-8 rounded-lg border border-[var(--border)] bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-[var(--muted)] transition-all cursor-pointer"
            title="Upload another document"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      
      {/* Document viewport — unified rendered view */}
      {isImage && imageUrl ? (
        /* Image Mode */
        <div className="flex-1 overflow-auto p-6 md:p-10 scroll-smooth custom-scrollbar bg-[var(--surface)] flex flex-col items-center justify-center">
          <div 
            id="doc-page-1"
            className={`relative bg-card p-3 border rounded-xl shadow-sm transition-all duration-700 max-w-full ${
              highlightedPage === 1 ? 'border-[var(--annotation)] shadow-md shadow-[var(--annotation)]/10 page-highlight' : 'border-[var(--border)]'
            }`}
          >
            <img src={imageUrl} alt={fileName} className="max-w-full h-auto rounded-lg shadow-xs" style={{ maxHeight: '80vh' }} />
          </div>
          {searchQuery && (
            <div className="mt-4 px-3 py-1.5 rounded-lg bg-card border border-[var(--border)] text-xs text-muted-foreground">
              {extractedText?.toLowerCase().includes(searchQuery.toLowerCase()) 
                ? `Match found in document text (${(extractedText.match(new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length} occurrences)`
                : "No matches found in document text"}
            </div>
          )}
        </div>
      ) : (
        /* PDF Mode with built-in textLayer canvas search highlights */
        <PdfRenderer
          file={visualSource}
          searchQuery={searchQuery}
          currentMatchIndex={currentMatchIndex}
          onMatchesFound={(count) => setMatchesCount(count)}
          highlightedPage={highlightedPage}
        />
      )}
    </div>
  );
}
