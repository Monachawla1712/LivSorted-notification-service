import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { LogEntity } from '../notification/log.entity';
import { CallRequestDto } from './dto/call.request.dto';
import { TemplateService } from '../template/template.service';
import { CommonService } from '../core/common/common.service';
import { ConfigService } from '@nestjs/config';
import { Config } from '../config/configuration';
import { ExotelCallRequestDto } from './dto/exotel.call.request.dto';
import { NotificationChannel } from '../core/enums/notification.channel';
import { NotificationStatus } from '../core/enums/notification.status';
import { ClientService } from '../core/client/client.service';
import { CustomLogger } from '../core/custom-logger';
import { AsyncContext } from '@nestjs-steroids/async-context';

@Injectable()
export class CallService {
  private readonly logger = new CustomLogger(CallService.name);

  constructor(
    private readonly asyncContext: AsyncContext<string, string>,
    private templateService: TemplateService,
    private commonService: CommonService,
    private clientService: ClientService,
    private configService: ConfigService<Config, true>,
    @InjectRepository(LogEntity)
    private readonly logRepository: Repository<LogEntity>,
  ) {}

  async makeDualCall(request: CallRequestDto) {
    const template = await this.templateService.getTemplateByName(
      request.templateName,
    );

    if (template.channel != NotificationChannel.CALL) {
      throw new HttpException(
        { message: 'Template channel does not match' },
        HttpStatus.BAD_REQUEST,
      );
    }
    const userIdentity = (
      await this.commonService.getUserIdentity(request.userId, template.channel)
    ).identity;

    const exotelCallRequestDto = new ExotelCallRequestDto();
    exotelCallRequestDto.callerId =
      this.configService.get<string>('exotel_caller_id');
    exotelCallRequestDto.from = request.fromPhoneNumber;
    exotelCallRequestDto.to = request.toPhoneNumber;

    const resp = await this.clientService.makeExotelCall(exotelCallRequestDto);

    await this.logRepository.save({
      user_id: request.userId,
      user_identity: userIdentity,
      template_id: template.id,
      template_name: request.templateName,
      channel: template.channel,
      title: template.title,
      body: resp.data,
      status:
        resp.status == 200
          ? NotificationStatus.SENT
          : NotificationStatus.FAILED,
    });

    if (resp.status != 200) {
      throw new HttpException(
        { message: 'Something went wrong while making exotel dual call.' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return {
      success: true,
      message: 'call connected successfully',
    };
  }
}
