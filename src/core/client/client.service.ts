import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, lastValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { Config } from '../../config/configuration';
import { OnesignalPnRequestDto } from '../../pn/dto/onesignal.pn.request.dto';
import { CustomLogger } from '../custom-logger';
import { AsyncContext } from '@nestjs-steroids/async-context';
import { GupshupWhatsappRequestParamsDto } from 'src/whatsapp/dto/gupshup.whatsapp.request.params.dto';
import { ExotelCallRequestDto } from '../../call/dto/exotel.call.request.dto';
import * as FormData from 'form-data';

@Injectable()
export class ClientService {
  private readonly logger = new CustomLogger(ClientService.name);

  constructor(
    private readonly asyncContext: AsyncContext<string, string>,
    private httpService: HttpService,
    private configService: ConfigService<Config, true>,
  ) {}

  async sendOnesignalPn(onesignalRequest: OnesignalPnRequestDto) {
    try {
      const resp = await firstValueFrom(
        this.httpService.request({
          method: 'post',
          baseURL: this.configService.get<string>('onesignal_url'),
          url: 'api/v1/notifications',
          headers: {
            'content-type': 'application/json',
            Authorization:
              'Bearer ' +
              this.configService.get<string>('onesignal_consumer_app_auth'),
          },
          data: onesignalRequest,
        }),
      );
      return resp.status;
    } catch (e) {
      this.logger.error(
        this.asyncContext.get('traceId'),
        'Error while sending pn request ${onesignalRequest}',
        e,
      );
      return e.response.status;
    }
  }

  async sendSmsGupshup(gupshupSmsRequestParams): Promise<any> {
    const resp = await firstValueFrom(
      this.httpService.request({
        method: 'get',
        baseURL: this.configService.get<string>('gupshup_url'),
        params: gupshupSmsRequestParams,
      }),
    );
    if (!resp.data.startsWith('success')) {
      throw new HttpException(
        { message: 'Error while sending SMS' },
        HttpStatus.BAD_REQUEST,
      );
    }
    return resp.status;
  }

  async sendWhatsappMessageGupshup(
    gupshupWhatsappRequestParamsDto: GupshupWhatsappRequestParamsDto,
  ): Promise<any> {
    try {
      const data = {
        source: this.configService.get<string>(
          'gupshup_whatsapp_sender_number',
        ),
        destination: gupshupWhatsappRequestParamsDto.send_to,
        message: JSON.stringify(gupshupWhatsappRequestParamsDto.message),
        template: JSON.stringify(gupshupWhatsappRequestParamsDto.template),
      };
      let gupshupUrl = this.configService.get<string>('gupshup_io_url');
      gupshupUrl +=
        gupshupWhatsappRequestParamsDto.message.type == 'text' ||
        gupshupWhatsappRequestParamsDto.message.type == 'file'
          ? '/wa/api/v1/msg'
          : '/wa/api/v1/template/msg';
      const resp = await firstValueFrom(
        this.httpService.request({
          method: 'POST',
          baseURL: gupshupUrl,
          headers: {
            'content-type': 'application/x-www-form-urlencoded',
            apiKey: this.configService.get<string>('gupshup_app_auth'),
          },
          data: data,
        }),
      );
      return resp.status;
    } catch (e) {
      this.logger.error(
        this.asyncContext.get('traceId'),
        'Error while sending Whatsapp Message via Gupshup',
        e,
      );
      return e.response.status;
    }
  }

  async sendHandpickedWhatsappMessageGupshup(
    gupshupWhatsappRequestParamsDto: GupshupWhatsappRequestParamsDto,
  ): Promise<any> {
    try {
      const data = {
        source: this.configService.get<string>(
          'gupshup_handpicked_whatsapp_sender_number',
        ),
        destination: gupshupWhatsappRequestParamsDto.send_to,
        message: JSON.stringify(gupshupWhatsappRequestParamsDto.message),
        template: JSON.stringify(gupshupWhatsappRequestParamsDto.template),
      };
      let gupshupUrl = this.configService.get<string>('gupshup_io_url');
      gupshupUrl +=
        gupshupWhatsappRequestParamsDto.message.type == 'text' ||
        gupshupWhatsappRequestParamsDto.message.type == 'file'
          ? '/wa/api/v1/msg'
          : '/wa/api/v1/template/msg';
      const resp = await firstValueFrom(
        this.httpService.request({
          method: 'POST',
          baseURL: gupshupUrl,
          headers: {
            'content-type': 'application/x-www-form-urlencoded',
            apiKey: this.configService.get<string>(
              'gupshup_handpicked_app_auth',
            ),
          },
          data: data,
        }),
      );
      return resp.status;
    } catch (e) {
      this.logger.error(
        this.asyncContext.get('traceId'),
        'Error while sending Whatsapp Message via Gupshup',
        e,
      );
      return e.response.status;
    }
  }

  async makeExotelCall(exotelCallRequest: ExotelCallRequestDto) {
    try {
      const key = this.configService.get<string>('exotel_api_key');
      const token = this.configService.get<string>('exotel_api_token');
      const sid = this.configService.get<string>('exotel_ssid');
      const subDomain = this.configService.get<string>('exotel_subdomain');
      const endpoint = `https://${subDomain}/v1/Accounts/${sid}/Calls/connect`;
      const formData = new FormData({
        writable: true,
      });
      formData.append('From', exotelCallRequest.from);
      formData.append('To', exotelCallRequest.to);
      formData.append('CallerId', exotelCallRequest.callerId);

      const resp = await lastValueFrom(
        this.httpService.post(endpoint, formData, {
          headers: {
            ...formData.getHeaders(),
          },
          auth: {
            username: key,
            password: token,
          },
        }),
      );
      return resp;
    } catch (e) {
      console.error(
        'Error while making exotel dual call ${exotelCallRequest}',
        e,
      );
      return e.response;
    }
  }
}
