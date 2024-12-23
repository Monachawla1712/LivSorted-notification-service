export class AwsGenericLambdaDto {
  private url: string;
  private method: string;
  private headers: { [key: string]: string };
  private data?: any;
  private params: { [key: string]: string };

  static createGenericLambdaDto(
    url: string,
    method: string,
    headers: { [key: string]: string },
    params: { [key: string]: string },
    data?: any,
  ): AwsGenericLambdaDto {
    const dto = new AwsGenericLambdaDto();
    dto.method = method;
    dto.headers = headers;
    dto.data = data;
    dto.params = params;
    dto.url = url;
    return dto;
  }
}
