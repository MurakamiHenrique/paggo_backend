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
    // Criar diretório de cache se não existir
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir);
    }
    this.worker = await createWorker('eng+por');
  }

  async onModuleDestroy() {
    if (this.worker) {
      await this.worker.terminate();
    }
  }

  private async preprocessImage(filePath: string): Promise<string> {
    const outputPath = path.join(this.cacheDir, `preprocessed_${path.basename(filePath)}`);
    
    await sharp(filePath)
      // Converter para escala de cinza
      .grayscale()
      // Aumentar contraste usando gamma
      .gamma(1.2)
      // Normalizar cores
      .normalize()
      // Redimensionar mantendo aspecto, mas limitando tamanho
      .resize(2000, 2000, {
        fit: 'inside',
        withoutEnlargement: true
      })
      // Remover ruído
      .median(1)
      // Ajustar brilho
      .modulate({
        brightness: 1.1
      })
      // Ajustar nitidez
      .sharpen({
        sigma: 1,
        m1: 0.5,
        m2: 0.5
      })
      // Salvar com alta qualidade
      .png({ quality: 100 })
      .toFile(outputPath);
    
    return outputPath;
  }

  private getCacheKey(filePath: string, options?: OcrOptions): string {
    const stat = fs.statSync(filePath);
    return `${filePath}_${stat.size}_${stat.mtime.getTime()}_${JSON.stringify(options)}`;
  }

  async extractTextFromImage(filePath: string, options?: OcrOptions): Promise<OcrResult> {
    try {
      const cacheKey = this.getCacheKey(filePath, options);
      
      // Verificar cache
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }

      if (!this.worker) {
        this.worker = await createWorker('eng+por');
      }

      // Pré-processar imagem
      const preprocessedPath = await this.preprocessImage(filePath);
      
      // Configurar reconhecimento
      const config = {
        lang: options?.lang || 'eng+por',
      };

      // Realizar OCR
      const { data: { text, confidence } } = await this.worker.recognize(preprocessedPath);
      
      // Limpar texto
      const cleanedText = text
        .trim()
        // Remover múltiplos espaços em branco
        .replace(/\s+/g, ' ')
        // Remover quebras de linha desnecessárias
        .replace(/(\r\n|\n|\r)/gm, ' ')
        .trim();

      const result = {
        text: cleanedText,
        confidence
      };

      // Armazenar no cache
      this.cache.set(cacheKey, result);

      // Limpar arquivo pré-processado
      try {
        fs.unlinkSync(preprocessedPath);
      } catch (error) {
        console.warn('Error cleaning up preprocessed file:', error);
      }

      return result;
    } catch (error) {
      throw new Error(`OCR processing failed: ${error.message}`);
    }
  }

  async extractTextFromPdf(filePath: string): Promise<string> {
    try {
      const cacheKey = this.getCacheKey(filePath);
      
      // Verificar cache
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached.text;
      }

      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer, {
        // Máximo de páginas para processar
        max: 50
      });

      const result = {
        text: pdfData.text.trim(),
        confidence: 100
      };

      // Armazenar no cache
      this.cache.set(cacheKey, result);

      return result.text;
    } catch (error) {
      throw new Error(`PDF text extraction failed: ${error.message}`);
    }
  }
}
