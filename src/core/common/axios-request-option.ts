interface AxiosRequestOptions {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data?: any;
  headers?: Record<string, string>;
  timeout?: number;
  responseType?:
    | 'json'
    | 'text'
    | 'blob'
    | 'arraybuffer'
    | 'document'
    | 'stream';
}
