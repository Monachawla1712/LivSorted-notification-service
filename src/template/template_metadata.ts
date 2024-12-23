import { ValidityType } from '../core/common/constants';

export class TemplateMetadata {
  url: string;
  image: string;
  ctaText: string;
  refTemplateId: string;
  valid_days: number;
  messageType?: string;
  type?: "PRML" | "TXN";
  valid_hours: number;
  validity_type: ValidityType;
}
