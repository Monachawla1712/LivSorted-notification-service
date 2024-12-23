import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { ClientService } from './client.service';

@Module({
  imports: [HttpModule],
  providers: [ClientService, ConfigService],
})
export class ClientModule {}
