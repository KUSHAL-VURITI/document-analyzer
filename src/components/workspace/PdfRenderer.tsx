"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Configure worker URL matching installed version 3.11.174
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/pdf.worker.min.js`;
}

interface PdfRendererProps {
  file: File | string | null;
  searchQuery: string;
  currentMatchIndex: number;
  onMatchesFound?: (count: number) => void;
  highlightedPage: number | null;
}

interface PageData {
  pageNum: number;
  viewport: any;
  textContent: any;
}

export function PdfRenderer({
  file,
  searchQuery,
  currentMatchIndex,
  onMatchesFound,
  highlightedPage,
}: PdfRendererProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pdfDoc, setPdfDoc] = useState<any>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const textLayerRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const renderedPagesRef = useRef<Set<number>>(new Set());

  // Load PDF Document
  useEffect(() => {
    let isCancelled = false;

    async function loadPdf() {
      if (!file) return;
      setLoading(true);
      setError(null);
      renderedPagesRef.current.clear();

      try {
        let docData: ArrayBuffer;
        if (typeof file === 'string') {
          const res = await fetch(file);
          if (!res.ok) throw new Error(`Failed to load PDF file: ${res.statusText}`);
          docData = await res.arrayBuffer();
        } else {
          docData = await file.arrayBuffer();
        }

        if (isCancelled) return;

        const loadingTask = pdfjsLib.getDocument({
          data: docData,
          cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/cmaps/`,
          cMapPacked: true,
        });

        const doc = await loadingTask.promise;
        if (isCancelled) return;

        setPdfDoc(doc);
        setNumPages(doc.numPages);
      } catch (err: any) {
        console.error("Error loading PDF:", err);
        if (!isCancelled) {
          setError(err.message || "Failed to render PDF document.");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadPdf();
    return () => {
      isCancelled = true;
    };
  }, [file]);

  // Render individual page canvas & textLayer
  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDoc || renderedPagesRef.current.has(pageNum)) return;

    try {
      const page = await pdfDoc.getPage(pageNum);
      const canvas = canvasRefs.current.get(pageNum);
      const textLayerDiv = textLayerRefs.current.get(pageNum);

      if (!canvas || !textLayerDiv) return;

      const scale = 1.5;
      const viewport = page.getViewport({ scale });

      // Canvas setup
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        await page.render({
          canvasContext: ctx,
          viewport,
        }).promise;
      }

      // Text Layer setup
      textLayerDiv.innerHTML = '';
      textLayerDiv.style.width = `${viewport.width}px`;
      textLayerDiv.style.height = `${viewport.height}px`;
      textLayerDiv.style.setProperty('--scale-factor', `${scale}`);

      const textContent = await page.getTextContent();

      await pdfjsLib.renderTextLayer({
        textContentSource: textContent,
        container: textLayerDiv,
        viewport,
        textDivs: [],
      }).promise;

      renderedPagesRef.current.add(pageNum);
    } catch (err) {
      console.error(`Error rendering page ${pageNum}:`, err);
    }
  }, [pdfDoc]);

  // Trigger rendering for all pages when PDF document is ready
  useEffect(() => {
    if (!pdfDoc || numPages === 0) return;
    for (let p = 1; p <= numPages; p++) {
      renderPage(p);
    }
  }, [pdfDoc, numPages, renderPage]);

  // Apply search match highlighting across all rendered text layers
  useEffect(() => {
    if (loading || numPages === 0) return;

    const query = searchQuery.trim().toLowerCase();
    let totalMatches = 0;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const textLayerDiv = textLayerRefs.current.get(pageNum);
      if (!textLayerDiv) continue;

      const spans = textLayerDiv.querySelectorAll('span');

      spans.forEach((span) => {
        // If query is empty, remove existing marks and restore text
        if (!query) {
          if (span.querySelector('mark')) {
            span.textContent = span.textContent;
          }
          return;
        }

        const text = span.textContent || '';
        if (!text.toLowerCase().includes(query)) {
          if (span.querySelector('mark')) {
            span.textContent = text;
          }
          return;
        }

        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escaped})`, 'gi');
        const parts = text.split(regex);

        span.innerHTML = '';
        parts.forEach((part) => {
          if (part.toLowerCase() === query) {
            const matchIdx = totalMatches;
            totalMatches++;
            const isActive = matchIdx === currentMatchIndex;

            const mark = document.createElement('mark');
            mark.id = `pdf-match-${matchIdx}`;
            mark.className = `search-match ${isActive ? 'search-match-active' : ''}`;
            mark.textContent = part;
            span.appendChild(mark);
          } else if (part) {
            span.appendChild(document.createTextNode(part));
          }
        });
      });
    }

    if (onMatchesFound) {
      onMatchesFound(totalMatches);
    }
  }, [searchQuery, currentMatchIndex, loading, numPages, onMatchesFound]);

  // Scroll to active match when currentMatchIndex changes
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length === 0) return;

    const targetMatch = document.getElementById(`pdf-match-${currentMatchIndex}`);
    if (targetMatch) {
      targetMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentMatchIndex, searchQuery]);

  // Citation jump / page highlight
  useEffect(() => {
    if (highlightedPage && highlightedPage >= 1 && highlightedPage <= numPages) {
      const pageEl = document.getElementById(`pdf-page-${highlightedPage}`);
      if (pageEl) {
        pageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [highlightedPage, numPages]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-[var(--danger-soft)] text-[var(--danger)] flex items-center justify-center mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <p className="text-sm font-medium text-foreground">{error}</p>
        <p className="text-xs text-muted-foreground mt-1">Please ensure this is a valid PDF document.</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="flex-1 w-full h-full overflow-auto p-4 md:p-8 scroll-smooth custom-scrollbar bg-[var(--surface)] flex flex-col items-center"
    >
      {loading && (
        <div className="flex flex-col items-center justify-center my-auto py-12 gap-3 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--annotation)]" />
          <span className="text-xs font-mono">Rendering document pages...</span>
        </div>
      )}

      <div className="space-y-6 pb-20 w-fit max-w-full">
        {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => {
          const isPageRef = highlightedPage === pageNum;

          return (
            <div
              key={pageNum}
              id={`pdf-page-${pageNum}`}
              className={`relative bg-white dark:bg-card border rounded-lg shadow-sm transition-all duration-500 overflow-hidden ${
                isPageRef 
                  ? 'ring-2 ring-[var(--annotation)] shadow-lg shadow-[var(--annotation)]/15 scale-[1.005]' 
                  : 'border-[var(--border)]'
              }`}
            >
              {/* Page header tag */}
              <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[10px] font-mono text-white/90 select-none pointer-events-none">
                Page {pageNum}
              </div>

              {/* Canvas Rendering */}
              <canvas
                ref={(el) => {
                  if (el) canvasRefs.current.set(pageNum, el);
                  else canvasRefs.current.delete(pageNum);
                }}
                className="block max-w-full h-auto"
              />

              {/* Text Layer for Selection & Highlights */}
              <div
                ref={(el) => {
                  if (el) textLayerRefs.current.set(pageNum, el);
                  else textLayerRefs.current.delete(pageNum);
                }}
                className="textLayer"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
