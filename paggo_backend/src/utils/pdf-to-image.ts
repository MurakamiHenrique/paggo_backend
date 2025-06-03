import * as fs from 'fs';
import * as pdfParse from 'pdf-parse';

// Rename function since we're no longer converting to image
export async function extractTextFromPdf(pdfPath: string): Promise<string> {
  try {
    // Read the PDF file
    const dataBuffer = fs.readFileSync(pdfPath);
    
    // Parse PDF and extract text
    const pdfData = await pdfParse(dataBuffer);
    
    // Return the extracted text
    return pdfData.text;
  } catch (error) {
    throw new Error(`Error extracting text from PDF: ${error.message}`);
  }
}
