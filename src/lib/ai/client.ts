import { useDocumentStore, SummaryData } from '@/lib/store';

export type SummaryResponse = SummaryData;

export async function fetchDocumentSummary(
  text: string, 
  mode: 'short' | 'medium' | 'long' = 'medium'
): Promise<SummaryResponse> {
  if (!text || text.trim().length === 0) {
    throw new Error("No readable text provided for summarization.");
  }

  const store = useDocumentStore.getState();

  // Instant response if already in client cache
  if (store.summaryCache[mode]) {
    const cachedData = store.summaryCache[mode]!;
    store.setSummaryMode(mode);
    store.setSummaryData(cachedData);
    return cachedData;
  }

  const res = await fetch('/api/summarize', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify({ 
      text, 
      mode 
    })
  });

  if (!res.ok) {
    let errorMsg = "Failed to generate summary.";
    try {
      const errData = await res.json();
      if (errData.error) errorMsg = errData.error;
    } catch (_) {}
    throw new Error(errorMsg);
  }

  const data: SummaryResponse = await res.json();
  if (!data.summary) {
    throw new Error("Invalid response format received from summarization service.");
  }

  // Cache and update store state
  store.setCachedSummary(mode, data);
  store.setSummaryMode(mode);
  store.setSummaryData(data);

  return data;
}
