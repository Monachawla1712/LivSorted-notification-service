import { Injectable, Scope, Logger } from '@nestjs/common';

@Injectable({ scope: Scope.TRANSIENT })
export class CustomLogger extends Logger {
  protected className: string;
  constructor(className: string) {
    super();
    this.className = className;
  }

  log(context: string, message: string): void {
    super.log(`${this.className} : ${message}`, context);
  }

  error(context: string, message: string, stack?: string): void {
    super.error(`${this.className} : ${message}`, stack, context);
  }

  warn(context: string, message: string): void {
    super.warn(`${this.className} : ${message}`, context);
  }

  debug(context: string, message: string): void {
    super.debug(`${this.className} : ${message}`, context);
  }

  verbose(context: string, message: string): void {
    super.verbose(`${this.className} : ${message}`, context);
  }
}
