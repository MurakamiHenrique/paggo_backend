import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Param,
  Body,
  Get,
  Res,
  NotFoundException,
  Query,
  Request,
  Delete,
  UseGuards,
  StreamableFile
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { createReadStream, existsSync, readFileSync, unlinkSync } from 'fs';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { OcrService } from '../utils/ocr.service';
import { explainWithGemini } from '../utils/gemini';
import { createChatCompletion } from '../utils/gemini';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ocrService: OcrService
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname);
        cb(null, `file-${uniqueSuffix}${ext}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|pdf)$/)) {
        cb(new BadRequestException('Only image or PDF files are allowed!'), false);
      } else {
        cb(null, true);
      }
    },
    limits: { fileSize: 10 * 1024 * 1024 }
  }))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('lang') lang: string = 'eng',
    @Request() req
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    try {
      const userId = req.user.userId;
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const extension = extname(file.originalname).toLowerCase();
      let extractedText = '';
      
      try {
        if (extension === '.pdf') {
          // For PDFs, extract text directly
          extractedText = await this.ocrService.extractTextFromPdf(file.path);
        } else {
          // For images, use optimized OCR with preprocessing
          const ocrResult = await this.ocrService.extractTextFromImage(file.path, {
            lang: lang || 'eng+por'
          });
          extractedText = ocrResult.text;
        }

        // Log success for monitoring
      } catch (error) {
        console.error(`Error extracting text from ${file.originalname}:`, error);
        throw new BadRequestException(`Text extraction failed: ${error.message}`);
      }

      const document = await this.prisma.document.create({
        data: {
          fileUrl: file.path,
          extractedText,
          fileName: file.originalname,
          userId: user.id,
          size: file.size,
          contentType: file.mimetype
        },
      });

      return {
        message: 'Document uploaded and text extracted. You can now chat with it.',
        documentId: document.id,
        extractedText: extractedText,
      };
    } catch (error) {
      if (file.path && existsSync(file.path)) {
        unlinkSync(file.path);
      }
      throw new BadRequestException(`Failed to process document: ${error.message}`);
    }
  }

  @Post(':id/chat')
  async chatWithDocument(
    @Param('id') documentId: string,
    @Body() body: { question: string }
  ) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: { interactions: true },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const answer = await createChatCompletion(
      document.extractedText,
      body.question
    );

    await this.prisma.lLMInteraction.create({
      data: {
        documentId,
        prompt: body.question,
        response: answer,
      },
    });

    return { answer };
  }  
  
  @Get('history')
  async getDocumentHistory(@Request() req) {
    try {
      const userId = req.user.userId;
      
      const documents = await this.prisma.document.findMany({
        where: {
          userId: userId
        },
        orderBy: {
          createdAt: 'desc'
        },
        select: {
          id: true,
          fileName: true,
          size: true,
          createdAt: true
        }
      });
      return documents;

    } catch (error) {
      console.error('Error fetching document history:', error);
      throw new Error('Failed to fetch document history');
    }
  }
  @Get()
  async getUserDocuments(@Request() req) {
    const userId = req.user.userId;

    return await this.prisma.document.findMany({
      where: { userId },
      include: { interactions: true },
    });
  }
  @Get(':id')
  async getDocumentById(@Param('id') id: string, @Request() req) {
    try {
      const document = await this.prisma.document.findUnique({
        where: { 
          id,
          userId: req.user.userId
        },
        include: { interactions: true }
      });

      if (!document) {
        throw new NotFoundException('Document not found');
      }      const chatInteractions = document.interactions.length === 0 
        ? [{
            id: 'welcome',
            documentId: document.id,
            response: `Hello! I've analyzed your document "${document.fileName}" and extracted the text content. I'm ready to answer questions about it, what would you like to know?`,
            createdAt: new Date()
          }]
        : document.interactions;

      return {
        ...document,
        chatInteractions,
        interactions: undefined
      };
    } catch (error) {
      console.error('Error fetching document:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error('Failed to fetch document');
    }
}

@Get(':id/download')
async downloadDocument(
  @Param('id') id: string,
  @Res() res: Response,
) {
  const doc = await this.prisma.document.findUnique({
    where: { id },
    include: { interactions: true },
  });

  if (!doc) {
    throw new NotFoundException('Document not found');
  }

  if (!existsSync(doc.fileUrl)) {
    throw new NotFoundException('Original file not found');
  }

  const fileBuffer = readFileSync(doc.fileUrl);
  const contentType = doc.contentType;
  const isImage = contentType.startsWith('image/');
  let pdfDoc: PDFDocument;

  try {
    if (isImage) {
      pdfDoc = await PDFDocument.create();
      let embeddedImage;
      if (contentType === 'image/png') {
        embeddedImage = await pdfDoc.embedPng(fileBuffer);
      } else {
        embeddedImage = await pdfDoc.embedJpg(fileBuffer);
      }    
      const page = pdfDoc.addPage([612, 792]);
      
      const maxWidth = 512;
      const maxHeight = 692; 
      const aspectRatio = embeddedImage.width / embeddedImage.height;
      
      let width = embeddedImage.width;
      let height = embeddedImage.height;
      
      if (width > maxWidth) {
        width = maxWidth;
        height = width / aspectRatio;
      }
      if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
      }
      
      const x = (612 - width) / 2;
      const y = (792 - height) / 2;
      
      page.drawImage(embeddedImage, {
        x,
        y,
        width,
        height,
      });
    } else {
      pdfDoc = await PDFDocument.load(fileBuffer);
    }

    const pageWidth = 612;
    const pageHeight = 792;
    const fontSize = 11;
    const lineHeight = fontSize * 1.3;
    let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - 50;
    
    const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);    const drawWrappedText = (text: string, prefix = '', color = rgb(0, 0, 0.3)) => {
      try {
        const sanitizedText = text.replace(/[\u{1F300}-\u{1F9FF}]/gu, '');
        const words = sanitizedText.split(/\s+/);
        let line = prefix;
        
        for (const word of words) {
          const testLine = line + word + ' ';
          const width = font.widthOfTextAtSize(testLine, fontSize);
          
          if (width > pageWidth - 100) {
            currentPage.drawText(line.trim(), { 
              x: 50, 
              y, 
              font,
              size: fontSize, 
              color 
            });
            y -= lineHeight;
            line = word + ' ';
            
            if (y < 100) {
              currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
              y = pageHeight - 50;
            }
          } else {
            line = testLine;
          }
        }
        
        if (line.trim()) {
          currentPage.drawText(line.trim(), { 
            x: 50, 
            y, 
            font,
            size: fontSize, 
            color 
          });
          y -= lineHeight;
        }
      } catch (error) {
        console.error('Error in drawWrappedText:', error);
        const fallbackText = prefix + text.replace(/[^\x00-\x7F]/g, ' ');
        currentPage.drawText(fallbackText, { 
          x: 50, 
          y, 
          font,
          size: fontSize, 
          color 
        });
        y -= lineHeight;
      }
    };

    if (doc.extractedText) {
      currentPage.drawText('Extracted Text (OCR):', { 
        x: 50, 
        y, 
        size: fontSize + 2, 
        font,
        color: rgb(0, 0, 0) 
      });
      y -= lineHeight * 2;
      drawWrappedText(doc.extractedText, '', rgb(0.2, 0.2, 0.2));
      y -= lineHeight;
    }

    if (doc.interactions.length > 0) {
      currentPage.drawText('LLM Interactions:', { 
        x: 50, 
        y, 
        size: fontSize + 2, 
        font,
        color: rgb(0, 0, 0) 
      });
      y -= lineHeight * 2;

      for (const [i, interaction] of doc.interactions.entries()) {
        drawWrappedText(`Q${i + 1}: ${interaction.prompt}`, '', rgb(0, 0.1, 0.4));
        drawWrappedText(`A${i + 1}: ${interaction.response}`, '', rgb(0.2, 0.2, 0.2));
        y -= lineHeight;
      }
    }

    const pdfBytes = await pdfDoc.save();
    const baseName = doc.fileName.replace(extname(doc.fileName), '');
    const newFileName = `${baseName}_with_analysis.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${newFileName}"`);
    res.send(Buffer.from(pdfBytes));

  } catch (err) {
    console.error(err);
    throw new BadRequestException('Failed to generate document');
  }
}

  @Delete(':id')
  async deleteDocument(@Param('id') id: string, @Request() req) {
    try {
      const document = await this.prisma.document.findUnique({
        where: { 
          id,
          userId: req.user.userId
        },
        include: { interactions: true }
      });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    await this.prisma.document.delete({
      where: { id }
    });

    if (document.fileUrl && existsSync(document.fileUrl)) {
      unlinkSync(document.fileUrl);
    }

    return {
      message: `Document ${document.fileName} and its interactions deleted successfully`
    };
  } catch (error) {
    console.error('Error deleting document:', error);
    if (error instanceof NotFoundException) {
      throw error;
    }
    throw new Error('Failed to delete document');
  }
}
}