# Architecture & Engineering Decisions

This document outlines the technical decisions and trade-offs made while building the Document Intelligence Assistant. The goal was to maximize performance, resilience, and user experience while adhering strictly to the constraints of a client-heavy, serverless architecture.

## 1. Extraction Pipeline: Server-First with Client-Side Fallback

### Problem
Extracting text from PDFs is computationally expensive and memory-intensive, leading to frequent timeouts on serverless platforms (like Vercel) if not handled carefully. Furthermore, purely client-side extraction creates a heavy initial bundle size and poor UX on low-end devices.

### Solution
We implemented a **hybrid extraction pipeline**:
1. **Server-Side parsing (Primary):** We use `pdf-parse` on the Next.js API route. This is extremely fast for text-based PDFs and keeps the client bundle light.
2. **Detection:** The server calculates the character density per page. If it detects an image-based/scanned PDF (very low character density), it safely aborts and signals the client.
3. **Client-Side OCR (Fallback):** The client dynamically imports `pdf.js` and `tesseract.js` only when instructed by the server. We use Web Workers to ensure the main thread remains unblocked during heavy OCR processing.

### Trade-offs
- *Added complexity* in state management to orchestrate the handoff between server and client.
- *Memory limits:* We intentionally scaled down the canvas resolution to `1.5x` during client OCR. A higher resolution would yield better OCR accuracy but frequently crash mobile browsers. 
- *Resilience over Accuracy:* We enforce a strict 60s timeout on the OCR worker to prevent infinite hanging on massive documents.

## 2. State Management: Zustand over Context API

### Problem
The document processing pipeline involves complex, multi-stage state transitions (Upload -> Server Parse -> Client OCR -> AI Analysis -> Summary). React Context would cause unnecessary re-renders across the entire layout for every progress tick.

### Solution
We used **Zustand** as a lightweight, global store outside the React component tree.
- Enables components like the Pipeline visualizer and AI Panel to subscribe only to the specific slices of state they need.
- Provides a clean imperative API (`useDocumentStore.getState()`) to manipulate state within async data fetching loops without complex `useEffect` dependencies.

## 3. Grounded AI & UX: The "Citation Anchor"

### Problem
Generative AI often hallucinates. In a document intelligence context, users must trust the summary and answers. A standard chatbot interface lacks context.

### Solution
- **Strict Prompting:** The AI is instructed to format citations as `[Page X]` strictly based on the extracted `---PAGE_BREAK---` markers.
- **Signature Interaction:** We parse the AI's streaming response, intercepting these citations to render interactive anchor tags. Clicking a citation dispatches a custom event that auto-scrolls the `DocumentViewer` pane and highlights the exact page block.

### Trade-offs
- We opted for page-level citations rather than precise line/phrase highlighting. Phrase highlighting requires complex exact-string matching which is fragile when dealing with OCR'd text or LLM summarization artifacts. Page-level grounding provides immediate trust verification without brittle logic.

## 4. UI/UX: Defying "SaaS AI" Tropes

### Design Philosophy
The application abandons the generic "dark mode with neon gradients" SaaS trend. We instead aimed for a "Digital Archive" aesthetic, heavily inspired by premium editorial design.
- **Typography:** We paired `Newsreader` (serif) for the document content and headers, `Inter` for UI elements, and `JetBrains Mono` for metadata. This maximizes reading comfort for long-form documents.
- **Split-Desk Layout:** The UI is strictly divided. The primary document remains anchored on the left (the source of truth), while the AI tools exist in a secondary, slightly darker panel on the right. This cognitive separation prevents the AI from overpowering the source material.

## 5. Security & Edge Cases
- **No Database:** As per constraints, we rely solely on transient React state and `localStorage`. No PII or sensitive document data is persisted.
- **Payload Limits:** We aggressively truncate document strings sent to the AI provider (`slice(0, 30000)`) to prevent context-window overflow and control costs, prioritizing the most relevant front-matter.
