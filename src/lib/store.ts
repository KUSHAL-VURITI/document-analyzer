import { create } from 'zustand';

export interface SummaryData {
  summary: string;
  keyPoints: string[];
  documentType: string;
}

interface DocumentState {
  file: File | null;
  setFile: (file: File | null) => void;
  extractedText: string | null;
  setExtractedText: (text: string | null) => void;
  status: 'idle' | 'uploading' | 'extracting' | 'ocr' | 'analyzing' | 'summarizing' | 'done' | 'error';
  setStatus: (status: DocumentState['status']) => void;
  errorMessage: string | null;
  setErrorMessage: (msg: string | null) => void;
  summaryData: SummaryData | null;
  setSummaryData: (data: SummaryData | null) => void;
  summaryMode: 'short' | 'medium' | 'long';
  setSummaryMode: (mode: 'short' | 'medium' | 'long') => void;
  summaryCache: Partial<Record<'short' | 'medium' | 'long', SummaryData>>;
  setCachedSummary: (mode: 'short' | 'medium' | 'long', data: SummaryData) => void;
  reset: () => void;
}

export const useDocumentStore = create<DocumentState>((set) => ({
  file: null,
  setFile: (file) => set({ 
    file, 
    status: 'idle', 
    extractedText: null, 
    errorMessage: null, 
    summaryData: null,
    summaryCache: {},
    summaryMode: 'medium'
  }),
  extractedText: null,
  setExtractedText: (text) => set({ extractedText: text }),
  status: 'idle',
  setStatus: (status) => set({ status }),
  errorMessage: null,
  setErrorMessage: (errorMessage) => set({ errorMessage, status: 'error' }),
  summaryData: null,
  setSummaryData: (summaryData) => set({ summaryData }),
  summaryMode: 'medium',
  setSummaryMode: (summaryMode) => set({ summaryMode }),
  summaryCache: {},
  setCachedSummary: (mode, data) => set((state) => ({
    summaryCache: { ...state.summaryCache, [mode]: data }
  })),
  reset: () => set({ 
    file: null, 
    extractedText: null, 
    status: 'idle', 
    errorMessage: null, 
    summaryData: null,
    summaryCache: {},
    summaryMode: 'medium'
  }),
}));
