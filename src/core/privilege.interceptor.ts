import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NestInterceptor,
  RequestMethod,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { EndpointDto } from '../privilege/dto/endpoint.dto';
import { PrivilegeService } from '../privilege/privilege.service';
import { CustomLogger } from './custom-logger';
import { AsyncContext } from '@nestjs-steroids/async-context';

@Injectable()
export class PrivilegeHandlerInterceptor implements NestInterceptor {
  private readonly logger = new CustomLogger(PrivilegeHandlerInterceptor.name);
  constructor(
    private readonly asyncContext: AsyncContext<string, string>,
    @Inject(PrivilegeService)
    private privilegeService: PrivilegeService,
  ) {}
  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const method: string = request.method.toUpperCase();
    const uri: string = request.route.path.toLowerCase();
    const userRoles: string[] = request.headers.roles
      ? request.headers.roles.replace(/ /g, '').split(',')
      : null;
    if (!(await this.preHandle(method, uri, userRoles))) {
      throw new HttpException(
        {
          message:
            'You do not have sufficient privileges. Please contact system administrator.',
        },
        HttpStatus.FORBIDDEN,
      );
    }
    request.headers.roles = userRoles;
    return next.handle();
  }

  async preHandle(
    method: string,
    uri: string,
    userRoles: string[],
  ): Promise<boolean> {
    if (!uri || uri === '/') return false;
    if (method === RequestMethod.OPTIONS.toString()) return true;
    const isBypass: boolean = await this.isBypassCall(method, uri);
    if (!isBypass) {
      if (userRoles != null) {
        const isPrivileged: boolean = await this.isEligibleHandler(
          method,
          uri,
          userRoles,
        );
        if (!isPrivileged) {
          this.logger.log(
            this.asyncContext.get('traceId'),
            'Unauthorized Access: ' + userRoles,
          );
          throw new HttpException(
            {
              message:
                'You do not have sufficient privileges. Please contact system administrator.',
            },
            HttpStatus.FORBIDDEN,
          );
        }
      } else {
        this.logger.log(
          this.asyncContext.get('traceId'),
          'Auth Header Found Empty',
        );
        throw new HttpException(
          {
            message: 'User Session Required. Please login to continue.',
          },
          HttpStatus.UNAUTHORIZED,
        );
      }
    }
    return true;
  }

  async isBypassCall(method: string, uri: string): Promise<boolean> {
    return this.matchHandlerCall(
      method,
      uri,
      this.populateHandlers(
        await this.privilegeService.getNoSessionEndpoints(),
      ),
    );
  }

  populateHandlers(endpointDto: EndpointDto[]): string[] {
    const resolvedHandlers: string[] = [];
    if (endpointDto != null) {
      endpointDto.forEach((endpoint) => {
        this.explodeHandlers(
          resolvedHandlers,
          endpoint.method.toUpperCase(),
          endpoint.uri.toLowerCase(),
        );
      });
    }
    return resolvedHandlers;
  }

  explodeHandlers(resolvedHandlers: string[], m: string, u: string) {
    if (m === 'ANY' || m === 'ALL') {
      resolvedHandlers.push(
        RequestMethod.GET.toString().concat(':').concat(u),
        RequestMethod.POST.toString().concat(':').concat(u),
        RequestMethod.PUT.toString().concat(':').concat(u),
        RequestMethod.DELETE.toString().concat(':').concat(u),
        RequestMethod.PATCH.toString().concat(':').concat(u),
        RequestMethod.ALL.toString().concat(':').concat(u),
        RequestMethod.HEAD.toString().concat(':').concat(u),
        RequestMethod.OPTIONS.toString().concat(':').concat(u),
      );
    } else {
      resolvedHandlers.push(m.concat(':').concat(u));
    }
  }

  matchHandlerCall(
    method: string,
    uri: string,
    resolvedHandlers: string[],
  ): boolean {
    let allowAccess = false;
    const paths: string[] = [];
    this.explodeHandlers(paths, method, uri);
    for (const path of paths) {
      if (resolvedHandlers.includes(path)) {
        allowAccess = true;
        break;
      }
    }
    return allowAccess;
  }

  async isEligibleHandler(
    method: string,
    uri: string,
    userRoles: string[],
  ): Promise<boolean> {
    const handlerPaths: string[] = [];
    this.explodeHandlers(handlerPaths, method, uri);
    if (handlerPaths.length < 1) return false;

    const roleHandlers: EndpointDto[] =
      await this.privilegeService.getOnlySessionEndpoints(
        userRoles,
        method,
        uri,
      );
    const resolvedHandlers: string[] = this.populateHandlers(roleHandlers);

    let allowAccess = false;
    if (resolvedHandlers.includes(method.concat(':').concat('*'))) {
      allowAccess = true;
    } else if (this.matchHandlerCall(method, uri, resolvedHandlers)) {
      allowAccess = true;
    }
    return allowAccess;
  }
}
