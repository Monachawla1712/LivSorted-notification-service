import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrivilegeService } from './privilege.service';
import { RolesEntity } from './entity/roles.entity';
import { RolePrivilegesEntity } from './entity/role-privileges.entity';
import { PrivilegeEndpointsEntity } from './entity/privilege-endpoints.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RolesEntity,
      RolePrivilegesEntity,
      PrivilegeEndpointsEntity,
    ]),
  ],
  providers: [PrivilegeService],
})
export class PrivilegeModule {}
