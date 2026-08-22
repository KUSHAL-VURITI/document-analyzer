import { create } from 'zustand';

interface DocumentState {
  file: File | null;
  setFile: (file: File | null) => void;
  extractedText: string | null;
  setExtractedText: (text: string | null) => void;
  status: 'idle' | 'uploading' | 'extracting' | 'ocr' | 'analyzing' | 'summarizing' | 'done' | 'error';
  setStatus: (status: DocumentState['status']) => void;
  errorMessage: string | null;
  setErrorMessage: (msg: string | null) => void;
  summaryData: { summary: string; keyPoints: string[]; documentType: string } | null;
  setSummaryData: (data: DocumentState['summaryData']) => void;
  summaryMode: 'short' | 'medium' | 'long';
  setSummaryMode: (mode: 'short' | 'medium' | 'long') => void;
  reset: () => void;
}

export const useDocumentStore = create<DocumentState>((set) => ({
  file: null,
  setFile: (file) => set({ file, status: 'idle', extractedText: null, errorMessage: null, summaryData: null }),
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
  reset: () => set({ 
    file: null, 
    extractedText: null, 
    status: 'idle', 
    errorMessage: null, 
    summaryData: null,
    summaryMode: 'medium'
  }),
}));
