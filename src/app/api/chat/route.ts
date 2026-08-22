import { streamText } from 'ai';
import { createGroq } from '@ai-sdk/groq';

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, documentText } = await req.json();

  if (!documentText) {
    return new Response('Missing document text', { status: 400 });
  }

  // Check if API key is present, if not, mock the stream
  if (!process.env.GROQ_API_KEY) {
    // Return mock data using the ai-sdk stream format (0:"text"\n)
    const mockText = "API Key is missing for the demo. But I can tell you that based on the document, revenue grew by 15% due to the enterprise segment. [Page 1]";
    return new Response(`0:"${mockText}"\n`, { 
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }

  const systemPrompt = `You are a helpful and precise assistant answering questions about a specific document.
You must ground your answers ONLY in the provided document text. 
If the answer is not contained in the document, you MUST explicitly say: "I cannot find the answer to that in the document." Do not guess or use outside knowledge.

Crucially, when you provide a fact or quote from the document, you MUST cite the page number. 
Use the format [Page X] at the end of the sentence. 
The document text contains markers like "---PAGE_BREAK---" to separate pages. Page 1 is the text before the first break.

Document Text:
${documentText.slice(0, 4000)}
`;

  const result = await streamText({
    model: groq('openai/gpt-oss-120b'),
    system: systemPrompt,
    messages,
  });

  return result.toTextStreamResponse();
}
