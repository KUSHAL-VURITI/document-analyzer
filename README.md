# Document Intelligence Assistant

A modern, full-stack Document Intelligence application built with Next.js (App Router), React 19, TypeScript, and the Vercel AI SDK. Designed for high readability, responsive performance, and grounded AI analysis across PDFs and images.

---

## Key Features

- **High-Fidelity PDF & Image Rendering**: Native multi-page PDF rendering via `pdfjs-dist` with hardware-accelerated canvas output and interactive text selection layers.
- **In-Document Search & Highlighting**: Fast in-document keyword search with real-time `<mark>` text-layer highlights, active vs. inactive match distinction, and next/previous keyboard navigation (<kbd>Enter</kbd> / <kbd>Shift</kbd>+<kbd>Enter</kbd>).
- **Hybrid Extraction Pipeline**: Server-side parsing (`unpdf`/`pdf-parse`) for text PDFs with seamless client-side Web Worker OCR (`tesseract.js`) fallback for scanned documents and image files.
- **Dynamic AI Summaries**: Adjustable summary lengths (**Short**, **Medium**, **Long**) with structured Key Takeaways and document classification.
- **Grounded Q&A with Interactive Citations**: "Ask This Document" chat with page-level citations (`[Page 1]`) that smoothly jump and highlight the referenced document page on click.
- **Editorial Design System & Dark Mode**: Modern palette with cohesive CSS variables and light/dark theme switching powered by `next-themes`.

---

## Tech Stack

- **Framework**: Next.js 16 (App Router) & React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS & Vanilla CSS Design Tokens
- **State Management**: Zustand
- **AI Integration**: Vercel AI SDK (`ai`, `@ai-sdk/groq`, `@ai-sdk/google`)
- **PDF & OCR**: `pdfjs-dist`, `unpdf`, `tesseract.js`
- **Icons**: Lucide React

---

## Getting Started

### 1. Prerequisites
- **Node.js**: v18.17+ or v20+
- **npm** or **pnpm** or **yarn**

### 2. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/KUSHAL-VURITI/document-analyzer.git
cd document-analyzer
npm install
```

### 3. Environment Configuration

Create a `.env.local` file in the project root:

```env
# Optional for live LLM summarization and chat (Groq / Gemini)
GROQ_API_KEY=your_groq_api_key_here
```

> **Note:** If no API key is provided, the application runs with mock streaming and built-in sample data for evaluation.

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Build for Production

```bash
npm run build
npm start
```

---

## Architecture Overview

1. **Upload & Ingestion**: Dropzone accepts PDF, JPG, PNG, and WEBP formats up to 10MB.
2. **Text Extraction**: The server attempts native stream extraction. If the document is scanned or image-based, client-side OCR workers process canvas page tiles without blocking the UI thread.
3. **Analysis & Insights**: Extracted text is processed via structured prompt templates, returning summaries, semantic categories, and key takeaways.
4. **Interactive Viewer**: Uses a layered architecture with `<canvas>` for visual fidelity and an overlaid `.textLayer` for text selection, citation navigation, and keyword search matches.

---

## License

MIT License.
