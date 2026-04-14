import 'multer'
import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { UploadService } from './upload.service'

@Controller('api/v1/upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  // FileInterceptor('file') tells Multer to look for a form field named 'file'.
  // memoryStorage (the default) keeps the file as a Buffer in memory —
  // we don't write it to disk because we only need it for AI extraction.
  // If we were persisting the file (e.g. to S3) we'd use diskStorage instead.
  @Post('teilungserklaerung')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max
      fileFilter: (_req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
          cb(new BadRequestException('Only PDF files are accepted'), false)
        } else {
          cb(null, true)
        }
      },
    }),
  )
  async extract(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded')
    }

    return this.uploadService.extractFromPdf(file.buffer)
  }
}