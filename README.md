# Document Intelligence Assistant

A sophisticated, browser-based Document Intelligence application built with Next.js (App Router), React, and the Vercel AI SDK. Designed with a strict focus on typography, reading comfort, and robust architecture to handle both native text PDFs and scanned documents.

> **Note to Reviewers:** Please see [ARCHITECTURE.md](./ARCHITECTURE.md) for a detailed breakdown of the engineering decisions, trade-offs, and UI/UX philosophy underlying this project.

## Features

- **Hybrid Extraction Pipeline:** Fast server-side parsing (`pdf-parse`) with a seamless fallback to client-side Web Worker OCR (`tesseract.js`) for scanned or image-based PDFs, bypassing serverless timeout limits.
- **Dynamic Summarization:** Toggle between Short, Medium, and Long AI-generated summaries, alongside auto-extracted Key Takeaways.
- **Intelligent Insights:** Calculates estimated reading time, word counts, semantic document types, and provides tailored improvement suggestions.
- **Ask This Document:** A grounded chat interface that answers questions based *strictly* on the uploaded document text.
- **Signature Interaction (Citation Anchors):** AI responses include explicit page citations (e.g., `[Page 1]`). Clicking these citations auto-scrolls the Document Viewer and highlights the exact referenced page block.
- **Document Search:** Client-side, lightning-fast in-document search with match counts and real-time visual highlighting.

## Getting Started

### 1. Prerequisites
- Node.js (v18+)
- (Optional but Recommended) A Google Gemini API Key or OpenAI API Key for live AI generation. If no key is provided, the app will gracefully fall back to a rich **Demo Mode** with mock data so you can still evaluate the UI and pipeline flow.

### 2. Installation

Clone the repository and install dependencies:

```bash
npm install
```

### 3. Environment Variables
Create a `.env.local` file in the root directory:

```env
# Add your Gemini API key for live AI functionality
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### 5. Quick Evaluation (Demo Mode)
If you want to instantly view the workspace UI without uploading a PDF or configuring API keys, navigate directly to:
[http://localhost:3000/workspace?demo=true](http://localhost:3000/workspace?demo=true)

## Tech Stack

- **Framework:** Next.js (App Router) + React 19
- **Styling:** Tailwind CSS + shadcn/ui
- **State Management:** Zustand
- **AI Infrastructure:** Vercel AI SDK (`@ai-sdk/react`, `@ai-sdk/google`)
- **PDF Extraction:** `pdf-parse` (Server) / `pdfjs-dist` & `tesseract.js` (Client Web Worker)

## Assessment Highlights

- **Resilience:** The OCR fallback prevents the application from failing completely on scanned documents.
- **UX:** The "Split-Desk" layout separates source truth (left) from AI analysis (right), leveraging specific typography (`Newsreader`, `Lora`) to reduce eye strain.
- **Engineering Judgment:** Explicit decisions were made to prioritize page-level citations over phrase-level highlighting to prevent fragile regex failures on OCR'd text.

---
*Built as a technical assessment submission.*
