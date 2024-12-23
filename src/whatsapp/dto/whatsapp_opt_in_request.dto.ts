import { IsBoolean, IsString } from 'class-validator';

export class WhatsappOptInRequestDto {
  @IsString()
  userPhone: string;

  @IsBoolean()
  whatsappOptIn: boolean;
}
