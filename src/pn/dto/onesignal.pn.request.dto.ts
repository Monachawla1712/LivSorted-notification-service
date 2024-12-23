export class OnesignalPnRequestDto {
  app_id: string;
  include_external_user_ids: string[];
  channel_for_external_user_ids: string;
  headings: Heading;
  contents: Content;
  app_url: string;
  big_picture: string;
  ios_attachments: {
    id: string
  };
}

export class Heading {
  en: string;
}

export class Content {
  en: string;
}
