export class GupshupSmsRequestParamsDto {
  method = 'SendMessage';
  send_to: string;
  msg: string;

  msg_type = 'Unicode_text';
  userid: string;
  auth_scheme = 'plain';
  password: string;
  v = '1.1';
  format = 'text';
}
