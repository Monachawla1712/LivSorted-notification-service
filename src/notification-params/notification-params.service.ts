import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { NotificationParamsEntity } from './notification-params.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { AsyncContext } from '@nestjs-steroids/async-context';
import { CustomLogger } from "../core/custom-logger";

@Injectable()
export class NotificationParamsService {
  private readonly logger = new CustomLogger(NotificationParamsService.name);
  constructor(
    private readonly asyncContext: AsyncContext<string, string>,
    @InjectRepository(NotificationParamsEntity)
    private readonly notificationParamsRepository: Repository<NotificationParamsEntity>
  ) {}

  async getNumberParamValue(paramKey: string, defaultValue: number) {
    try {
      const param = await this.notificationParamsRepository.findOne({
        where: { param_key: paramKey },
      });
      if (param == null) {
        return defaultValue;
      }
      return Number(param.param_value);
    } catch (e) {
      this.logger.error(
        this.asyncContext.get('traceId'),
        'Something went wrong while fetching paramKey :' + paramKey,
        e,
      );
      return defaultValue;
    }
  }

  async getStringParamValue(paramKey: string, defaultValue: string) {
    try {
      const param = await this.notificationParamsRepository.findOne({
        where: { param_key: paramKey },
      });
      if (param == null) {
        return defaultValue;
      }
      return param.param_value;
    } catch (e) {
      this.logger.error(
        this.asyncContext.get('traceId'),
        'Something went wrong while fetching paramKey :' + paramKey,
        e,
      );
      return defaultValue;
    }
  }

  async getJsonParamValue(paramKey: string, defaultValue: any): Promise<any> {
    try {
      const param = await this.notificationParamsRepository.findOne({
        where: { param_key: paramKey },
      });
      if (param == null) {
        return defaultValue;
      }
      return JSON.parse(param.param_value);
    } catch (e) {
      this.logger.error(
        this.asyncContext.get('traceId'),
        'Something went wrong while fetching paramKey :' + paramKey,
        e,
      );
      return defaultValue;
    }
  }

  async updateAndFetch(key: string) {
    const updatedParams = await this.notificationParamsRepository
      .createQueryBuilder()
      .update(NotificationParamsEntity)
      .set({ param_value: () => '"param_value"::integer + 1' })
      .where('param_key = :key', { key })
      .returning('param_value')
      .execute();

    if (updatedParams.raw.length > 0) {
      return updatedParams.raw[0].param_value;
    } else {
      return null;
    }
  }
}
