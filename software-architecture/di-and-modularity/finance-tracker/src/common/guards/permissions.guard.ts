import {
  Injectable,
  CanActivate,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PermissionRegistryService } from '../../core/permissions/permission-registry.service';
import { UserPermissionsService } from '../../core/permissions/user-permissions.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionRegistry: PermissionRegistryService,
    private userPermissionsService: UserPermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.get<string[]>(
      PERMISSIONS_KEY,
      context.getHandler(),
    );

    // Case 1: No decorator — public route, allow through
    if (!requiredPermissions) return true;

    // Case 2: Permission string not in registry — fail loudly
    for (const permission of requiredPermissions) {
      if (!this.permissionRegistry.isKnownPermission(permission)) {
        throw new InternalServerErrorException(
          `Unknown permission "${permission}" on ${context.getClass().name}.${context.getHandler().name}. ` +
            `Did you forget to register it in a PermissionDescriptor?`,
        );
      }
    }

    // Case 3: Check user's effective permissions from assigned roles
    const request = context
      .switchToHttp()
      .getRequest<{ user: { id: number; householdId: number } }>();
    const userId = request.user.id;

    const userPermissions =
      await this.userPermissionsService.getEffectivePermissions(userId);

    return requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );
  }
}
