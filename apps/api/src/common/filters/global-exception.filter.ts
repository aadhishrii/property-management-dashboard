import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { Request, Response } from 'express'

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const res = ctx.getResponse<Response>()
    const req = ctx.getRequest<Request>()

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR

    const raw =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error'

    // If the response is an object (like our DUPLICATE_WARNING),
    // pass it through entirely instead of extracting just the message.
    // This preserves the full payload including the existing array.
    const body =
      typeof raw === 'object' && raw !== null
        ? { ...raw as object, path: req.url, timestamp: new Date().toISOString() }
        : {
            statusCode: status,
            message:    raw,
            path:       req.url,
            timestamp:  new Date().toISOString(),
          }

    this.logger.error(
      `${req.method} ${req.url} → ${status}`,
      exception instanceof Error ? exception.stack : String(exception),
    )

    res.status(status).json(body)
  }
}