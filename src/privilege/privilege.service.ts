import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EndpointDto } from './dto/endpoint.dto';
import { PrivilegeEndpointsEntity } from './entity/privilege-endpoints.entity';
import { CustomLogger } from '../core/custom-logger';
import { AsyncContext } from '@nestjs-steroids/async-context';

@Injectable()
export class PrivilegeService {
  private readonly logger = new CustomLogger(PrivilegeService.name);
  constructor(
    private readonly asyncContext: AsyncContext<string, string>,
    @InjectRepository(PrivilegeEndpointsEntity)
    private readonly privilegeEndpointsEntityRepository: Repository<PrivilegeEndpointsEntity>,
  ) {}

  public async getNoSessionEndpoints(): Promise<EndpointDto[]> {
    return (await this.privilegeEndpointsEntityRepository
      .createQueryBuilder('endpoints')
      .select(['method', 'uri', 'privilege_slug'])
      .where({ uri_mode: 'NO_SESSION' })
      .execute()) as EndpointDto[];
  }

  public async getOnlySessionEndpoints(
    roles: string[],
    method: string,
    uri: string,
  ): Promise<EndpointDto[]> {
    return (await this.privilegeEndpointsEntityRepository.query(
      "SELECT DISTINCT e.method, e.uri, e.privilege_slug FROM notification.privilege_endpoints e left JOIN notification.role_privileges r ON r.privilege_slug = e.privilege_slug JOIN notification.roles g on r.role_id = g.id WHERE e.uri_mode = 'ONLY_SESSION' AND g.name = ANY($1) AND e.method = $2 AND e.uri = $3",
      [roles, method, uri],
    )) as EndpointDto[];
  }
}
