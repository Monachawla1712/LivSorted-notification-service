export class ErrorBean {
  code: string;
  message: string;
  field: string;

  constructor(code: string, message: string, field: string) {
    this.code = code;
    this.message = message;
    this.field = field;
  }
}
