import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationParamsService } from './notification-params.service';
import { NotificationParamsEntity } from './notification-params.entity';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationParamsEntity])],
  providers: [NotificationParamsService],
})
export class NotificationParamsModule {}
