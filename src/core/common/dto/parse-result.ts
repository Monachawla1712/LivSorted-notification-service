export class ParseResult<T> {
  successRows: T[] = [];
  failedRows: T[] = [];
  key: string = null;
  headerMapping: string;
}
