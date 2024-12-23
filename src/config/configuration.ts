import { EnvironmentVariables } from './env.validation';

export interface Config {
  appEnv: string;
  port: string;
  db_host: string;
  db_port: string;
  db_username: string;
  db_password: string;
  db_name: string;
  util_url: string;
  util_token: string;
  clevertap_url: string;
  clevertap_account_id: string;
  clevertap_passcode: string;
  onesignal_url: string;
  onesignal_consumer_app_id: string;
  onesignal_consumer_app_auth: string;
  smtp_username: string;
  smtp_password: string;
  smtp_from_email: string;
  gupshup_userid: string;
  gupshup_pwd: string;
  gupshup_url: string;
  gupshup_io_url: string;
  gupshup_app_name: string;
  gupshup_app_auth: string;
  gupshup_whatsapp_sender_number: string;
  gupshup_handpicked_app_name: string;
  gupshup_handpicked_app_auth: string;
  gupshup_handpicked_whatsapp_sender_number: string;
  exotel_caller_id: string;
  exotel_api_key: string;
  exotel_api_token: string;
  exotel_subdomain: string;
  exotel_ssid: string;
  default_timeout: number;
  consumer_url: string;
  client_aws_access_key: string;
  client_aws_secret_key: string;
  gupshup_promo_pwd: string;
  gupshup_promo_userid: string;
}

export default (): Config => {
  const processEnv = process.env as unknown as EnvironmentVariables;
  return {
    appEnv: processEnv.ENV,
    port: processEnv.PORT || '3012',
    db_host: processEnv.DATABASE_HOST,
    db_port: processEnv.DATABASE_PORT,
    db_username: processEnv.DATABASE_USERNAME,
    db_password: processEnv.DATABASE_PASSWORD,
    db_name: processEnv.DATABASE_NAME,
    clevertap_url: processEnv.CLEVERTAP_URL,
    clevertap_account_id: processEnv.CLEVERTAP_ACCOUNT_ID,
    clevertap_passcode: processEnv.CLEVERTAP_PASSCODE,
    onesignal_url: processEnv.ONESIGNAL_URL,
    onesignal_consumer_app_id: processEnv.ONESIGNAL_CONSUMER_APP_ID,
    onesignal_consumer_app_auth: processEnv.ONESIGNAL_CONSUMER_APP_AUTH,
    smtp_username: processEnv.SMTP_USERNAME,
    smtp_password: processEnv.SMTP_PASSWORD,
    smtp_from_email: processEnv.SMTP_FROM_EMAIL,
    gupshup_userid: processEnv.GUPSHUP_USERID,
    gupshup_pwd: processEnv.GUPSHUP_PASSWORD,
    gupshup_promo_userid: processEnv.GUPSHUP_PROMOTIONAL_USERID,
    gupshup_promo_pwd: processEnv.GUPSHUP_PROMOTIONAL_PASSWORD,
    gupshup_url: processEnv.GUPSHUP_URL,
    gupshup_io_url: processEnv.GUPSHUP_IO_URL,
    gupshup_app_name: processEnv.GUPSHUP_APP_NAME,
    gupshup_app_auth: processEnv.GUPSHUP_APP_AUTH,
    gupshup_whatsapp_sender_number: processEnv.GUPSHUP_WHATSAPP_SENDER_NUMBER,
    gupshup_handpicked_app_name: processEnv.GUPSHUP_HANDPICKED_APP_NAME,
    gupshup_handpicked_app_auth: processEnv.GUPSHUP_HANDPICKED_APP_AUTH,
    gupshup_handpicked_whatsapp_sender_number:
      processEnv.GUPSHUP_HANDPICKED_WHATSAPP_SENDER_NUMBER,
    exotel_ssid: processEnv.EXOTEL_SSID,
    exotel_subdomain: processEnv.EXOTEL_SUBDOMAIN,
    exotel_api_token: processEnv.EXOTEL_API_TOKEN,
    exotel_api_key: processEnv.EXOTEL_API_KEY,
    exotel_caller_id: processEnv.EXOTEL_CALLER_ID,
    util_url: processEnv.UTIL_URL,
    util_token: processEnv.UTIL_TOKEN,
    default_timeout: processEnv.DEFAULT_TIMEOUT || 10000,
    consumer_url: processEnv.CONSUMER_URL,
    client_aws_access_key: processEnv.CLIENT_AWS_ACCESS_KEY,
    client_aws_secret_key: processEnv.CLIENT_AWS_SECRET_KEY,
  };
};
