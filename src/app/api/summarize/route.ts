import { NextRequest, NextResponse } from "next/server";
import { generateDocumentSummary } from "@/lib/ai/provider";
import { SYSTEM_PROMPTS } from "@/lib/ai/prompts";

export async function POST(req: NextRequest) {
  try {
    const { text, mode = "medium" } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }
    
    if (!process.env.GROQ_API_KEY) {
      // Return mock data for the demo if API key is missing
      console.warn("No Groq API key found. Returning mock summary data.");
      await new Promise(r => setTimeout(r, 2000));
      return NextResponse.json({
        summary: `[Mock ${mode} Summary] This document discusses various financial metrics and strategic initiatives for Q4. It highlights a 15% increase in revenue compared to the previous quarter, driven largely by the enterprise segment.`,
        keyPoints: [
          "Q4 revenue increased by 15%",
          "Enterprise segment is the primary growth driver",
          "Operating costs decreased by 2%"
        ],
        documentType: "Financial Report"
      });
    }

    // Limit text length to prevent context window overflow (e.g., limit to ~30k chars for safety)
    const truncatedText = text.slice(0, 30000);

    const result = await generateDocumentSummary(
      truncatedText, 
      mode as "short" | "medium" | "long", 
      SYSTEM_PROMPTS.summary
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Summarization error:", error);
    return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 });
  }
}
