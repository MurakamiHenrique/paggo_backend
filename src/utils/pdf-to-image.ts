import * as fs from 'fs';
import * as pdfParse from 'pdf-parse';

export async function extractTextFromPdf(pdfPath: string): Promise<string> {
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    
    const pdfData = await pdfParse(dataBuffer);
    
    return pdfData.text;
  } catch (error) {
    throw new Error(`Error extracting text from PDF: ${error.message}`);
  }
}
