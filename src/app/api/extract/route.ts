import { NextRequest, NextResponse } from "next/server";
import { extractText } from "unpdf";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.type.startsWith("image/")) {
      // Direct images immediately trigger client-side OCR
      return NextResponse.json({ status: "requires_ocr" });
    }

    if (file.type === "application/pdf") {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);
      
      const { text, totalPages } = await extractText(buffer);

      // text is an array of strings per page in unpdf
      const fullText = text.join("\n---PAGE_BREAK---\n") + "\n---PAGE_BREAK---\n";

      // Count actual characters, ignoring the page break markers and whitespace
      const cleanText = fullText.replace(/---PAGE_BREAK---/g, '').replace(/\s+/g, '').trim();
      
      // If we have less than 50 characters of actual text per page (on average), 
      // it's almost certainly a scanned PDF composed of images.
      const averageCharsPerPage = totalPages > 0 ? cleanText.length / totalPages : 0;
      
      if (averageCharsPerPage < 50) {
        return NextResponse.json({ status: "requires_ocr" });
      }

      return NextResponse.json({ 
        status: "success", 
        text: fullText,
        numPages: totalPages
      });
    }

    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });

  } catch (error) {
    console.error("Extraction server error (delegating to client OCR/parser):", error);
    return NextResponse.json({ status: "requires_ocr" }, { status: 200 });
  }
}
