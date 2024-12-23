import { Injectable } from '@nestjs/common';
import { AsyncContext } from '@nestjs-steroids/async-context';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOperator, In, LessThan, Repository } from 'typeorm';
import { NotificationQueueEntity } from './notification.queue.entity';

@Injectable()
export class NotificationQueueService {
  constructor(
    private readonly asyncContext: AsyncContext<string, string>,
    @InjectRepository(NotificationQueueEntity)
    private readonly repository: Repository<NotificationQueueEntity>,
  ) {}

  async save(entities: NotificationQueueEntity[]) {
    return await this.repository.save(entities);
  }

  async findByCampaignIdAndProcessed(
    campaignId: string,
    isProcessed: boolean,
    limit: number,
  ) {
    return await this.repository.find({
      where: {
        campaign_id: campaignId,
        is_processed: isProcessed,
        is_active: true,
      },
      take: limit,
      order: { id: 'ASC' },
    });
  }

  async purgeQueueDataBefore(days: number) {
    return await this.repository.delete({
      is_processed: true,
      created_at: LessThan(
        new Date(new Date().getTime() - 1000 * 60 * 60 * 24 * days),
      ),
    });
  }

  async markQueuesAsProcessed(ids) {
    return await this.repository.update(
      { id: In(ids) },
      { is_processed: true },
    );
  }

  async markInactive(userIds) {
    return await this.repository.update(
      { user_id: In(userIds) },
      { is_active: false },
    );
  }
}
