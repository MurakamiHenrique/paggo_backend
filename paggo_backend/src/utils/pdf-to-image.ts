import * as path from 'path';
import * as fs from 'fs';
import * as poppler from 'pdf-poppler';

export async function convertPdfToImage(pdfPath: string): Promise<string> {
  const outputBaseName = path.join('./uploads', 'converted');
  const options = {
    format: 'png',
    out_dir: './uploads',
    out_prefix: 'converted',
  };

  await poppler.convert(pdfPath, options);
  const outputPath = `${outputBaseName}-1.png`;
  if (!fs.existsSync(outputPath)) {
    throw new Error('PDF to image conversion failed');
  }

  return outputPath;
}
