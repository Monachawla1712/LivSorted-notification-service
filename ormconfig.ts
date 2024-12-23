import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { LogEntity } from './src/notification/log.entity';
import { TemplateEntity } from './src/template/template.entity';
import { ClevertapEntity } from './src/clevertap/clevertap.entity';
import { DataSource } from 'typeorm';
import { UserEntity } from './src/notification/user.entity';
import { PrivilegeEndpointsEntity } from './src/privilege/entity/privilege-endpoints.entity';
import { RolesEntity } from './src/privilege/entity/roles.entity';
import { RolePrivilegesEntity } from './src/privilege/entity/role-privileges.entity';
import { BulkUploadEntity } from 'src/notification/bulk-upload.entity';

config();

const configService = new ConfigService();

export default new DataSource({
  type: 'postgres',
  host: configService.get('DATABASE_HOST'),
  port: configService.get('DATABASE_PORT'),
  username: configService.get('DATABASE_USERNAME'),
  password: configService.get('DATABASE_PASSWORD'),
  database: configService.get('DATABASE_NAME'),
  entities: [
    LogEntity,
    TemplateEntity,
    ClevertapEntity,
    UserEntity,
    RolesEntity,
    RolePrivilegesEntity,
    PrivilegeEndpointsEntity,
    BulkUploadEntity,
  ],
  migrations: ['migrations/*'],
  migrationsTableName: 'notification.notification_migration',
});
