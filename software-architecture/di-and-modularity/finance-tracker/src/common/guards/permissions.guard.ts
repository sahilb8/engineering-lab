import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PermissionRegistryService } from '../../core/permissions/permission-registry.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionRegistry: PermissionRegistryService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.get<string[]>(
      PERMISSIONS_KEY,
      context.getHandler(),
    );

    if (!requiredPermissions) return true;

    const request = context
      .switchToHttp()
      .getRequest<{ user: { role: string } }>();
    const userRole = request.user.role;

    const userPermissions =
      this.permissionRegistry.getPermissionsForRole(userRole);

    return requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );
  }
}
