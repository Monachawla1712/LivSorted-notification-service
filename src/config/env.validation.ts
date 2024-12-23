import { InternalServerErrorException } from '@nestjs/common';
import { Expose, plainToClass } from 'class-transformer';
import { IsEnum, IsNotEmpty, validateSync } from 'class-validator';

export enum Environment {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
}

export class EnvironmentVariables {
  @Expose()
  @IsEnum(Environment)
  ENV!: Environment;

  @Expose()
  PORT!: string;

  @IsNotEmpty()
  @Expose()
  DATABASE_HOST!: string;

  @Expose()
  DATABASE_PORT?: string;

  @Expose()
  DATABASE_USERNAME?: string;

  @Expose()
  DATABASE_PASSWORD?: string;

  @Expose()
  DATABASE_NAME?: string;

  @Expose()
  CLEVERTAP_URL?: string;

  @Expose()
  CLEVERTAP_ACCOUNT_ID?: string;

  @Expose()
  CLEVERTAP_PASSCODE?: string;

  @Expose()
  ONESIGNAL_URL?: string;

  @Expose()
  ONESIGNAL_CONSUMER_APP_ID?: string;

  @Expose()
  ONESIGNAL_CONSUMER_APP_AUTH?: string;

  @Expose()
  SMTP_USERNAME?: string;

  @Expose()
  SMTP_PASSWORD?: string;

  @Expose()
  SMTP_FROM_EMAIL?: string;

  @Expose()
  GUPSHUP_USERID: string;

  @Expose()
  GUPSHUP_PASSWORD: string;

  @Expose()
  GUPSHUP_PROMOTIONAL_USERID: string;

  @Expose()
  GUPSHUP_PROMOTIONAL_PASSWORD: string;

  @Expose()
  GUPSHUP_URL: string;

  @Expose()
  DEBUG: string;

  @Expose()
  GUPSHUP_IO_URL: string;

  @Expose()
  GUPSHUP_APP_NAME: string;

  @Expose()
  GUPSHUP_APP_AUTH: string;

  @Expose()
  GUPSHUP_WHATSAPP_SENDER_NUMBER: string;

  @Expose()
  GUPSHUP_HANDPICKED_APP_NAME: string;

  @Expose()
  GUPSHUP_HANDPICKED_APP_AUTH: string;

  @Expose()
  GUPSHUP_HANDPICKED_WHATSAPP_SENDER_NUMBER: string;

  @Expose()
  EXOTEL_SSID: string;

  @Expose()
  EXOTEL_SUBDOMAIN: string;

  @Expose()
  EXOTEL_API_TOKEN: string;

  @Expose()
  EXOTEL_API_KEY: string;

  @Expose()
  EXOTEL_CALLER_ID: string;

  @Expose()
  UTIL_TOKEN: string;

  @Expose()
  UTIL_URL: string;

  @Expose()
  DEFAULT_TIMEOUT: number;

  @Expose()
  CONSUMER_URL: string;

  @Expose()
  CLIENT_AWS_ACCESS_KEY: string;

  @Expose()
  CLIENT_AWS_SECRET_KEY: string;
}

export function validate(config: Record<string, unknown>) {
  const transformedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
    excludeExtraneousValues: true,
  });

  const errors = validateSync(transformedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new InternalServerErrorException(errors.toString());
  }

  return transformedConfig;
}
