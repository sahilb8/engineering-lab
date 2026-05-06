import {
  Injectable,
  CanActivate,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
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

    // Case 1: No decorator — public route, allow through
    if (!requiredPermissions) return true;

    // Case 2: Permission string not in registry — fail loudly
    const allRegistered = this.permissionRegistry.getAllPermissions();
    for (const permission of requiredPermissions) {
      if (!allRegistered.includes(permission)) {
        throw new InternalServerErrorException(
          `Unknown permission "${permission}" on ${context.getClass().name}.${context.getHandler().name}. ` +
            `Did you forget to register it in a PermissionDescriptor?`,
        );
      }
    }

    // Case 3: Check user's role permissions
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
