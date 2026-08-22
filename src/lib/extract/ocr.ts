export async function runClientOCR(
  file: File,
  onProgress?: (progress: number, status: string) => void
): Promise<string> {
  const tesseract = await import('tesseract.js');
  
  // 5-minute timeout to allow for CDN language downloads and large files
  const TIMEOUT_MS = 300000;
  
  const ocrPromise = async () => {
    onProgress?.(5, 'Initializing OCR engine...');
    
    const worker = await tesseract.createWorker("eng", 1, {
      logger: m => {
        if (m.status === 'recognizing text') {
          const pct = Math.round(m.progress * 90) + 10;
          onProgress?.(pct, `Recognizing text... ${pct}%`);
        }
      }
    });

    try {
      let fullText = '';

      if (file.type.startsWith('image/')) {
        onProgress?.(10, 'Processing image...');
        const ret = await worker.recognize(file);
        fullText = ret.data.text;
      } else if (file.type === 'application/pdf') {
        onProgress?.(10, 'Loading PDF for OCR...');
        // Dynamically import pdfjs to avoid bundling it on the server
        const pdfjsLib = await import('pdfjs-dist');
        // Set worker src
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const numPages = pdf.numPages;

        for (let i = 1; i <= numPages; i++) {
          onProgress?.(10 + Math.round((i / numPages) * 10), `Rendering page ${i}/${numPages}...`);
          
          const page = await pdf.getPage(i);
          // Use a lower scale (e.g. 1.5 instead of 2 or 3) to keep canvas size and memory usage down
          const viewport = page.getViewport({ scale: 1.5 });
          
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) throw new Error("Could not create canvas context");
          
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          await page.render({
            canvasContext: context,
            viewport: viewport
          }).promise;

          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          
          onProgress?.(20 + Math.round((i / numPages) * 70), `Running OCR on page ${i}/${numPages}...`);
          const ret = await worker.recognize(dataUrl);
          
          fullText += ret.data.text + '\n---PAGE_BREAK---\n';
        }
      } else {
        throw new Error("Unsupported file type for OCR");
      }

      await worker.terminate();
      return fullText;

    } catch (e) {
      await worker.terminate();
      throw e;
    }
  };

  // Wrap in a timeout
  return Promise.race([
    ocrPromise(),
    new Promise<string>((_, reject) => 
      setTimeout(() => reject(new Error("OCR processing timed out after 5 minutes.")), TIMEOUT_MS)
    )
  ]);
}
