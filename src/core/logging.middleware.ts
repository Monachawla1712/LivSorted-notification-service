import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AsyncContext } from '@nestjs-steroids/async-context';
import { CustomLogger } from './custom-logger';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  constructor(private readonly asyncContext: AsyncContext<string, any>) {}
  private readonly logger = new CustomLogger(LoggingMiddleware.name);

  use(req: Request, res: Response, next: () => void) {
    const start = Date.now();
    this.asyncContext.register();
    this.asyncContext.set('traceId', uuidv4());
    this.logger.log(
      this.asyncContext.get('traceId'),
      `[${req.method}]:${req.baseUrl} | userAgent:${this.getUserAgent(
        req,
      )} | referer:${this.getReferer(req)} | requestId:${this.getRequestId(
        req,
      )} | ip:${this.getClientIpAddr(req)}`,
    );

    res.on('finish', () => {
      const duration = Date.now() - start;
      this.logger.log(
        this.asyncContext.get('traceId'),
        `[${req.method}]:${req.route.path} - Time taken: ${duration}ms`,
      );
      this.asyncContext.clear();
    });
    next();
  }

  getClientIpAddr(request: Request): string {
    let ip = request.header('X-Forwarded-For');

    if (!ip || ip === 'unknown') {
      ip = request.header('Proxy-Client-IP');
    }
    if (!ip || ip === 'unknown') {
      ip = request.header('WL-Proxy-Client-IP');
    }
    if (!ip || ip === 'unknown') {
      ip = request.header('HTTP_X_FORWARDED_FOR');
    }
    if (!ip || ip === 'unknown') {
      ip = request.header('HTTP_X_FORWARDED');
    }
    if (!ip || ip === 'unknown') {
      ip = request.header('HTTP_X_CLUSTER_CLIENT_IP');
    }
    if (!ip || ip === 'unknown') {
      ip = request.header('HTTP_CLIENT_IP');
    }
    if (!ip || ip === 'unknown') {
      ip = request.header('HTTP_FORWARDED_FOR');
    }
    if (!ip || ip === 'unknown') {
      ip = request.header('HTTP_FORWARDED');
    }
    if (!ip || ip === 'unknown') {
      ip = request.header('HTTP_VIA');
    }
    if (!ip || ip === 'unknown') {
      ip = request.header('REMOTE_ADDR');
    }
    if (!ip || ip === 'unknown') {
      ip = request.connection.remoteAddress; // Fallback to connection remoteAddress
    }

    try {
      this.logger.debug(this.asyncContext.get('traceId'), 'Caller IP: ' + ip);
      if (ip && ip.includes(',')) {
        ip = ip.split(',')[0];
      }
    } catch (e) {
      this.logger.warn(
        this.asyncContext.get('traceId'),
        'Error in obtaining client IP address: ' + e.message,
      );
    }

    if (ip && ip === '0:0:0:0:0:0:0:1') {
      ip = '127.0.0.1';
    }

    return ip || '';
  }

  getReferer(request: Request): string {
    let referer = request.header('referer');
    if (!referer) {
      referer = request.header('Referer');
    }
    return referer || '';
  }

  getUserAgent(request: Request): string {
    let userAgent = request.header('user-agent');
    if (!userAgent) {
      userAgent = request.header('User-Agent');
    }
    return userAgent || '';
  }

  getRequestId(request: Request): string {
    const requestId = request.header('x-rzrequest-id');
    return requestId || uuidv4();
  }
}
