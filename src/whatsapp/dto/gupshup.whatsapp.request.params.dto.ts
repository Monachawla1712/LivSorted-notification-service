export class GupshupWhatsappMessage {
  type: string;
  text: string;
  video: { id: string };
  image: { link: string };
  document: { link: string; filename: string };
  url: string;
  caption: string;
  filename: string;
}
export class GupshupWhatsappRequestParamsDto {
  send_to: string;
  msg: string;
  message: GupshupWhatsappMessage;
  template: { id: string; params: string[] };
}
