import { streamText } from 'ai';
import { getAiModel } from '@/lib/ai/provider';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, documentText } = await req.json();

  if (!documentText) {
    return new Response('Missing document text', { status: 400 });
  }

  const model = getAiModel();
  if (!model) {
    return new Response(
      "AI service is currently unavailable. Please configure GROQ_API_KEY in your hosting environment variables.",
      { 
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      }
    );
  }

  const systemPrompt = `You are a helpful and precise assistant answering questions about a specific document.
You must ground your answers ONLY in the provided document text. 
If the answer is not contained in the document, you MUST explicitly say: "I cannot find the answer to that in the document." Do not guess or use outside knowledge.

Crucially, when you provide a fact or quote from the document, you MUST cite the page number. 
Use the format [Page X] at the end of the sentence. 
The document text contains markers like "---PAGE_BREAK---" to separate pages. Page 1 is the text before the first break.

Document Text:
${documentText.slice(0, 10000)}
`;

  const result = await streamText({
    model,
    system: systemPrompt,
    messages,
  });

  return result.toTextStreamResponse();
}
