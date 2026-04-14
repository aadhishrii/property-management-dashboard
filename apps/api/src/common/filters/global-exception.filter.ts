import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { Request, Response } from 'express'
 
// @Catch() with no arguments catches everything — HttpExceptions and
// unexpected runtime errors alike. This means the frontend always gets
// the same JSON shape regardless of what went wrong.
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name)
 
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx     = host.switchToHttp()
    const res     = ctx.getResponse<Response>()
    const req     = ctx.getRequest<Request>()
 
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR
 
    // HttpException.getResponse() can return either a string or an object.
    // When class-validator fails it returns { message: string[], statusCode, error }.
    // We pull the message out in both cases.
    const raw =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error'
 
    const message =
      typeof raw === 'object' && raw !== null && 'message' in raw
        ? (raw as any).message
        : raw
 
    this.logger.error(
      `${req.method} ${req.url} → ${status}`,
      exception instanceof Error ? exception.stack : String(exception),
    )
 
    res.status(status).json({
      statusCode: status,
      message,
      path: req.url,
      timestamp: new Date().toISOString(),
    })
  }
}