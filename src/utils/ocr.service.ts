import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createWorker, Worker } from 'tesseract.js';
import * as pdfParse from 'pdf-parse';
import * as fs from 'fs';
import * as sharp from 'sharp';
import * as path from 'path';
import { OcrResult, OcrOptions } from './ocr.types';

@Injectable()
export class OcrService implements OnModuleInit, OnModuleDestroy {
  private worker: Worker;
  private cache: Map<string, OcrResult> = new Map();
  private readonly cacheDir = './cache'; 

  async onModuleInit() {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir);
    }

    this.worker = await createWorker('eng+por', 1, {
    });
    await this.worker.setParameters({
      tessedit_pagesegmode: 3,
    });
  }

  async onModuleDestroy() {
    if (this.worker) {
      await this.worker.terminate();
    }
  }

  private async preprocessImageToBuffer(filePath: string): Promise<Buffer> {
    return await sharp(filePath)
      .grayscale()
      .resize(5000, 5000, { 
        fit: 'inside',          
        withoutEnlargement: true 
      })
      .jpeg({ quality: 20 }) 
      .toBuffer(); 
  }

  private getCacheKey(filePath: string, options?: OcrOptions): string {
    const stat = fs.statSync(filePath);
    return `${filePath}_${stat.size}_${stat.mtime.getTime()}_${JSON.stringify(options)}`;
  }

  async extractTextFromImage(filePath: string, options?: OcrOptions): Promise<OcrResult> {
    try {
      const cacheKey = this.getCacheKey(filePath, options);
      
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }

      const imageBuffer = await this.preprocessImageToBuffer(filePath);
      
      const { data: { text, confidence } } = await this.worker.recognize(imageBuffer);
      
      const cleanedText = text
        .replace(/\r\n|\r/g, '\n') 
        .replace(/[ \t]+/g, ' ')  
        .replace(/\n\s*\n/g, '\n\n')
        .trim(); 
      const result = {
        text: cleanedText,
        confidence
      };

      this.cache.set(cacheKey, result);

      return result;
    } catch (error) {
      throw new Error(`OCR processing failed: ${error.message}`);
    }
  }

  async extractTextFromPdf(filePath: string): Promise<string> {
    try {
      const cacheKey = this.getCacheKey(filePath);
      
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached.text;
      }

      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer, {
        max: 50 
      });

      const result = {
        text: pdfData.text.trim(),
        confidence: 100 
      };

      this.cache.set(cacheKey, result);

      return result.text;
    } catch (error) {
      throw new Error(`PDF text extraction failed: ${error.message}`);
    }
  }
}