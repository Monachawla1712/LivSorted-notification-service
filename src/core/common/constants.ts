export class Endpoints {
  static readonly CLEVERTAP_EVENT_REQUEST = '/1/upload';
  static readonly CLEVERTAP_PROFILE_REQUEST = '/1/upload';
  static readonly CLEVERTAP_NOTIFICATION_REQUEST = '/1/send/push.json';
  static readonly PUBLISH_CAMPAIGN = '/notification/campaign/publish';
  static readonly PROCESS_CAMPAIGN = '/notification/campaign/data/process';
}

export class AWSConstants {
  static readonly AWS_REGION = 'ap-south-1';
  static readonly CAMPAIGN_FOLDER = 'campaign-sheets';
}

export const enum ValidityType {
  DAYS = 'DAYS',
  HOURS = 'HOURS',
}

export class NotificationParams {
  static readonly SEND_NOTIFICATION_CHANNEL = 'SEND_NOTIFICATION_CHANNEL';
}
