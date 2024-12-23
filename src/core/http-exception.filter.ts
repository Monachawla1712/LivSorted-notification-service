import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';
import { CustomLogger } from './custom-logger';
import { AsyncContext } from '@nestjs-steroids/async-context';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new CustomLogger(HttpExceptionFilter.name);
  constructor(private readonly asyncContext: AsyncContext<string, string>) {}

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();

    this.logger.error(
      this.asyncContext.get('traceId'),
      JSON.stringify(exception),
    );

    let message = null;

    if (exception) {
      if (exception.getResponse()) {
        if (
          exception.getResponse()['message'] != null &&
          exception.getResponse()['message'].constructor === Array
        ) {
          message = exception.getResponse()['message'].join();
        } else {
          message = exception.getResponse()['message'];
        }
      }
    }

    response.status(status).json({
      statusCode: status,
      message: message,
    });
  }
}
