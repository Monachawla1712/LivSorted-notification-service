import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { AsyncContext } from '@nestjs-steroids/async-context';
import { CustomLogger } from './custom-logger';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new CustomLogger(AllExceptionsFilter.name);
  constructor(private readonly asyncContext: AsyncContext<string, string>) {}

  catch(exception: HttpException, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest();
    const response = context.getResponse();

    const errorResponse = {
      timestamp: new Date().toLocaleDateString(),
      path: request.url,
      method: request.method,
      message: exception,
    };

    this.logger.error(
      this.asyncContext.get('traceId'),
      JSON.stringify(exception),
    );

    response.status(400).json(errorResponse);
  }
}
