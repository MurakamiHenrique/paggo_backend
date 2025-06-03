import { Module } from '@nestjs/common';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { OcrModule } from '../utils/ocr.module';

@Module({
  imports: [OcrModule],
  controllers: [DocumentController],
  providers: [DocumentService]
})
export class DocumentModule {}
