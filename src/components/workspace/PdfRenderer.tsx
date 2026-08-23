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
  const [pageScale, setPageScale] = useState<number>(1.2);

  const containerRef = useRef<HTMLDivElement>(null);
  const textLayerRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const renderedPagesRef = useRef<Set<number>>(new Set());

  // Measure container and compute fit-to-width scale
  const computeFitScale = useCallback(async (doc: any) => {
    if (!containerRef.current || !doc) return;
    try {
      const firstPage = await doc.getPage(1);
      const unscaledViewport = firstPage.getViewport({ scale: 1.0 });
      const containerWidth = containerRef.current.clientWidth;
      const horizontalPadding = containerWidth < 640 ? 24 : 48;
      const targetWidth = Math.max(containerWidth - horizontalPadding, 280);
      
      // Calculate scale to fit page width to container without side scrolling
      const fitScale = targetWidth / unscaledViewport.width;
      setPageScale(Math.min(Math.max(fitScale, 0.4), 2.5));
    } catch (e) {
      console.warn("Could not calculate fit scale:", e);
    }
  }, []);

  // Handle window/container resize
  useEffect(() => {
    if (!containerRef.current || !pdfDoc) return;

    const resizeObserver = new ResizeObserver(() => {
      computeFitScale(pdfDoc);
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [pdfDoc, computeFitScale]);

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
        await computeFitScale(doc);
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
  }, [file, computeFitScale]);

  // Render individual page canvas with Device Pixel Ratio and matching textLayer
  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDoc) return;

    try {
      const page = await pdfDoc.getPage(pageNum);
      const canvas = canvasRefs.current.get(pageNum);
      const textLayerDiv = textLayerRefs.current.get(pageNum);

      if (!canvas || !textLayerDiv) return;

      const baseScale = pageScale;
      const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
      
      // Render canvas at full device pixel density for crisp retina display
      const renderViewport = page.getViewport({ scale: baseScale * dpr });
      // CSS viewport for exact 1:1 layout matching
      const cssViewport = page.getViewport({ scale: baseScale });

      // Canvas dimensions
      canvas.width = Math.floor(renderViewport.width);
      canvas.height = Math.floor(renderViewport.height);
      canvas.style.width = `${Math.floor(cssViewport.width)}px`;
      canvas.style.height = `${Math.floor(cssViewport.height)}px`;

      const ctx = canvas.getContext('2d', { alpha: false });
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        await page.render({
          canvasContext: ctx,
          viewport: renderViewport,
        }).promise;
      }

      // Text Layer setup: identical scale and dimensions
      textLayerDiv.innerHTML = '';
      textLayerDiv.style.width = `${Math.floor(cssViewport.width)}px`;
      textLayerDiv.style.height = `${Math.floor(cssViewport.height)}px`;
      textLayerDiv.style.setProperty('--scale-factor', `${baseScale}`);

      const textContent = await page.getTextContent();

      await pdfjsLib.renderTextLayer({
        textContentSource: textContent,
        container: textLayerDiv,
        viewport: cssViewport,
        textDivs: [],
      }).promise;

      renderedPagesRef.current.add(pageNum);
    } catch (err) {
      console.error(`Error rendering page ${pageNum}:`, err);
    }
  }, [pdfDoc, pageScale]);

  // Trigger rendering when PDF document or page scale changes
  useEffect(() => {
    if (!pdfDoc || numPages === 0) return;
    renderedPagesRef.current.clear();
    for (let p = 1; p <= numPages; p++) {
      renderPage(p);
    }
  }, [pdfDoc, numPages, pageScale, renderPage]);

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
  }, [searchQuery, currentMatchIndex, loading, numPages, pageScale, onMatchesFound]);

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
      className="flex-1 w-full h-full overflow-y-auto overflow-x-hidden p-3 sm:p-6 md:p-8 scroll-smooth custom-scrollbar bg-[var(--surface)] flex flex-col items-center"
    >
      {loading && (
        <div className="flex flex-col items-center justify-center my-auto py-12 gap-3 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--annotation)]" />
          <span className="text-xs font-mono">Rendering high-resolution pages...</span>
        </div>
      )}

      <div className="space-y-6 pb-20 w-fit max-w-full flex flex-col items-center">
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
