import { format, transports } from 'winston';
import {
  utilities as nestWinstonModuleUtilities,
  WinstonModule,
} from 'nest-winston';

export const LoggerFactory = (appName: string) => {
  const consoleFormat = format.combine(
    format.timestamp(),
    format.ms(),
    nestWinstonModuleUtilities.format.nestLike(appName, {
      colors: true,
      prettyPrint: true,
    }),
  );

  return WinstonModule.createLogger({
    level: process.env.DEBUG === 'true' ? 'debug' : 'info',
    transports: [new transports.Console({ format: consoleFormat })],
  });
};
