import * as pdfjsLib from 'pdfjs-dist';

// Worker configuration
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/pdf.worker.min.js`;
}

export interface ClientExtractionResult {
  text: string;
  numPages: number;
  isScanned: boolean;
}

export async function extractPdfTextClient(file: File): Promise<ClientExtractionResult> {
  const arrayBuffer = await file.arrayBuffer();
  
  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/cmaps/`,
    cMapPacked: true,
  });

  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const pageTexts: string[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageStr = textContent.items
      .map((item: any) => item.str)
      .join(' ')
      .trim();
    pageTexts.push(pageStr);
  }

  const fullText = pageTexts.join('\n---PAGE_BREAK---\n') + '\n---PAGE_BREAK---\n';
  const cleanText = fullText.replace(/---PAGE_BREAK---/g, '').replace(/\s+/g, '').trim();
  const averageCharsPerPage = numPages > 0 ? cleanText.length / numPages : 0;
  const isScanned = averageCharsPerPage < 50;

  return {
    text: fullText,
    numPages,
    isScanned
  };
}
