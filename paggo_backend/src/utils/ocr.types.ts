export interface OcrResult {
  text: string;
  confidence?: number;
}

export interface OcrOptions {
  lang?: string;
}
