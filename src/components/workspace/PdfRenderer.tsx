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
  const [viewerWidth, setViewerWidth] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const pageContainerRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const textLayerRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const pageTextContentRef = useRef<Map<number, any>>(new Map());

  // Track container width via ResizeObserver to dynamically fill panel width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateWidth = () => {
      if (containerRef.current) {
        const clientW = containerRef.current.clientWidth;
        if (clientW > 0) {
          setViewerWidth(clientW);
        }
      }
    };

    updateWidth();

    const resizeObserver = new ResizeObserver(() => {
      updateWidth();
    });

    resizeObserver.observe(el);
    return () => resizeObserver.disconnect();
  }, []);

  // Load PDF Document
  useEffect(() => {
    let isCancelled = false;

    async function loadPdf() {
      if (!file) return;
      setLoading(true);
      setError(null);
      pageTextContentRef.current.clear();

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

  // Render individual page canvas with page-specific fit-to-width calculation
  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDoc || viewerWidth <= 0) return;

    try {
      const page = await pdfDoc.getPage(pageNum);
      const canvas = canvasRefs.current.get(pageNum);
      const pageContainer = pageContainerRefs.current.get(pageNum);

      if (!canvas) return;

      const unscaledViewport = page.getViewport({ scale: 1.0 });
      // Calculate fit-to-width scale specifically for this page's aspect ratio and dimensions
      // Reserve 32px for side padding (16px on each side)
      const targetWidth = Math.max(viewerWidth - 32, 280);
      const pageScale = targetWidth / unscaledViewport.width;

      const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
      
      // High-DPI canvas rendering
      const renderViewport = page.getViewport({ scale: pageScale * dpr });
      // Exact CSS display viewport
      const cssViewport = page.getViewport({ scale: pageScale });

      const cssWidth = Math.round(cssViewport.width);
      const cssHeight = Math.round(cssViewport.height);

      // Set container dimensions
      if (pageContainer) {
        pageContainer.style.width = `${cssWidth}px`;
        pageContainer.style.height = `${cssHeight}px`;
      }

      // Set canvas display and pixel density dimensions
      canvas.width = Math.round(renderViewport.width);
      canvas.height = Math.round(renderViewport.height);
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;
      canvas.style.display = 'block';

      const ctx = canvas.getContext('2d', { alpha: false });
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        await page.render({
          canvasContext: ctx,
          viewport: renderViewport,
        }).promise;
      }

      // Fetch and cache text content with the page's exact CSS viewport
      const textContent = await page.getTextContent();
      pageTextContentRef.current.set(pageNum, { textContent, viewport: cssViewport });
    } catch (err) {
      console.error(`Error rendering page ${pageNum}:`, err);
    }
  }, [pdfDoc, viewerWidth]);

  // Trigger rendering when document or viewer panel width changes
  useEffect(() => {
    if (!pdfDoc || numPages === 0 || viewerWidth <= 0) return;
    for (let p = 1; p <= numPages; p++) {
      renderPage(p);
    }
  }, [pdfDoc, numPages, viewerWidth, renderPage]);

  // Render textLayer and search highlights with character-level precision and scaleX matching
  useEffect(() => {
    if (loading || numPages === 0 || viewerWidth <= 0) return;

    const query = searchQuery.trim().toLowerCase();
    let totalMatches = 0;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const textLayerDiv = textLayerRefs.current.get(pageNum);
      const pageData = pageTextContentRef.current.get(pageNum);

      if (!textLayerDiv || !pageData) continue;

      const { textContent, viewport } = pageData;
      const cssWidth = Math.round(viewport.width);
      const cssHeight = Math.round(viewport.height);

      textLayerDiv.innerHTML = '';
      textLayerDiv.style.width = `${cssWidth}px`;
      textLayerDiv.style.height = `${cssHeight}px`;
      textLayerDiv.style.position = 'absolute';
      textLayerDiv.style.top = '0px';
      textLayerDiv.style.left = '0px';
      textLayerDiv.style.overflow = 'hidden';
      textLayerDiv.style.lineHeight = '1';
      textLayerDiv.style.userSelect = 'text';

      textContent.items.forEach((item: any) => {
        if (!item.str && item.str !== ' ') return;

        // Exact affine coordinate transformation
        const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
        const fontHeight = Math.sqrt(tx[2] * tx[2] + tx[3] * tx[3]);
        const left = tx[4];
        const top = tx[5] - fontHeight;
        const targetWidth = item.width * viewport.scale;

        const span = document.createElement('span');
        span.style.position = 'absolute';
        span.style.left = `${left}px`;
        span.style.top = `${top}px`;
        span.style.fontSize = `${fontHeight}px`;
        span.style.fontFamily = item.fontName || 'sans-serif';
        span.style.transformOrigin = '0% 0%';
        span.style.whiteSpace = 'pre';
        span.style.color = 'transparent';
        span.style.lineHeight = '1';
        span.style.cursor = 'text';

        const rawText = item.str;

        if (query && rawText.toLowerCase().includes(query)) {
          const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`(${escaped})`, 'gi');
          const parts = rawText.split(regex);

          parts.forEach((part: string) => {
            if (part.toLowerCase() === query) {
              const matchIdx = totalMatches;
              totalMatches++;

              const mark = document.createElement('mark');
              mark.id = `pdf-match-${matchIdx}`;
              mark.className = 'search-match';
              mark.style.color = 'transparent';
              mark.style.backgroundColor = 'rgba(245, 158, 11, 0.45)';
              mark.style.borderRadius = '2px';
              mark.style.display = 'inline';
              mark.textContent = part;
              span.appendChild(mark);
            } else if (part) {
              span.appendChild(document.createTextNode(part));
            }
          });
        } else {
          span.textContent = rawText;
        }

        textLayerDiv.appendChild(span);

        // Apply scaleX transform to guarantee character-level bounding box match
        if (targetWidth > 0 && span.offsetWidth > 0) {
          const scaleX = targetWidth / span.offsetWidth;
          if (item.transform[1] !== 0 || item.transform[2] !== 0) {
            const a = (tx[0] / fontHeight) * scaleX;
            const b = tx[1] / fontHeight;
            const c = tx[2] / fontHeight;
            const d = tx[3] / fontHeight;
            span.style.transform = `matrix(${a}, ${b}, ${c}, ${d}, 0, 0)`;
          } else {
            span.style.transform = `scaleX(${scaleX})`;
          }
        }
      });
    }

    if (onMatchesFound) {
      onMatchesFound(totalMatches);
    }
  }, [searchQuery, loading, numPages, viewerWidth, onMatchesFound]);

  // Update active match styling and scroll target into view
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length === 0) return;

    // Reset previous active marks
    const allActiveMarks = document.querySelectorAll('.textLayer mark.search-match-active');
    allActiveMarks.forEach((m: any) => {
      m.classList.remove('search-match-active');
      m.style.backgroundColor = 'rgba(245, 158, 11, 0.45)';
      m.style.boxShadow = 'none';
    });

    // Apply active highlight styling
    const targetMatch = document.getElementById(`pdf-match-${currentMatchIndex}`);
    if (targetMatch) {
      targetMatch.classList.add('search-match-active');
      targetMatch.style.backgroundColor = 'rgba(59, 91, 219, 0.65)';
      targetMatch.style.boxShadow = '0 0 0 2px var(--annotation)';
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
      className="flex-1 w-full h-full overflow-y-auto overflow-x-hidden p-2 sm:p-4 scroll-smooth custom-scrollbar bg-[var(--surface)] flex flex-col items-center"
    >
      {loading && (
        <div className="flex flex-col items-center justify-center my-auto py-12 gap-3 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--annotation)]" />
          <span className="text-xs font-mono">Rendering high-resolution pages...</span>
        </div>
      )}

      <div className="space-y-6 pb-20 w-full flex flex-col items-center">
        {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => {
          const isPageRef = highlightedPage === pageNum;

          return (
            <div
              key={pageNum}
              id={`pdf-page-${pageNum}`}
              ref={(el) => {
                if (el) pageContainerRefs.current.set(pageNum, el);
                else pageContainerRefs.current.delete(pageNum);
              }}
              className={`relative bg-white dark:bg-card rounded-lg shadow-sm transition-all duration-300 overflow-hidden ${
                isPageRef 
                  ? 'ring-2 ring-[var(--annotation)] shadow-lg shadow-[var(--annotation)]/15 scale-[1.005]' 
                  : 'ring-1 ring-[var(--border)]'
              }`}
              style={{
                boxSizing: 'border-box',
                position: 'relative',
              }}
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
                className="block"
                style={{
                  margin: 0,
                  padding: 0,
                }}
              />

              {/* Text Layer for Selection & Highlights */}
              <div
                ref={(el) => {
                  if (el) textLayerRefs.current.set(pageNum, el);
                  else textLayerRefs.current.delete(pageNum);
                }}
                className="textLayer"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  margin: 0,
                  padding: 0,
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
