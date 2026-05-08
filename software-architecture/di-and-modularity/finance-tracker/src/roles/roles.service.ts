import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionRegistryService } from '../core/permissions/permission-registry.service';
import { UserPermissionsService } from '../core/permissions/user-permissions.service';

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionRegistry: PermissionRegistryService,
    private readonly userPermissionsService: UserPermissionsService,
  ) {}

  async create(
    householdId: number,
    actorUserId: number,
    data: { name: string; permissions: string[] },
  ) {
    this.validatePermissionKeys(data.permissions);
    await this.checkDelegation(actorUserId, data.permissions);

    return this.prisma.customRole.create({
      data: {
        name: data.name,
        permissions: data.permissions,
        householdId,
      },
    });
  }

  async findAll(householdId: number) {
    return this.prisma.customRole.findMany({
      where: { householdId },
      include: { assignments: { include: { user: true } } },
    });
  }

  async findOne(householdId: number, id: number) {
    const role = await this.prisma.customRole.findFirst({
      where: { id, householdId },
      include: { assignments: { include: { user: true } } },
    });
    if (!role) throw new NotFoundException(`Role #${id} not found`);
    return role;
  }

  async update(
    householdId: number,
    id: number,
    actorUserId: number,
    data: { name?: string; permissions?: string[] },
  ) {
    const existing = await this.findOne(householdId, id);

    if (data.permissions) {
      this.validatePermissionKeys(data.permissions);

      // Only check delegation for newly added permissions
      const added = data.permissions.filter(
        (p) => !existing.permissions.includes(p),
      );
      if (added.length > 0) {
        await this.checkDelegation(actorUserId, added);
      }
    }

    return this.prisma.customRole.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.permissions && { permissions: data.permissions }),
      },
    });
  }

  async remove(householdId: number, id: number) {
    await this.findOne(householdId, id);

    await this.prisma.userRoleAssignment.deleteMany({ where: { roleId: id } });
    return this.prisma.customRole.delete({ where: { id } });
  }

  async assignRole(
    householdId: number,
    roleId: number,
    userId: number,
    actorUserId: number,
  ) {
    const role = await this.findOne(householdId, roleId);

    const user = await this.prisma.user.findFirst({
      where: { id: userId, householdId },
    });
    if (!user)
      throw new NotFoundException(
        `User #${userId} not found in this household`,
      );

    // Check that the actor can delegate all permissions in the role
    await this.checkDelegation(actorUserId, role.permissions);

    return this.prisma.userRoleAssignment.create({
      data: { userId, roleId },
    });
  }

  async unassignRole(householdId: number, roleId: number, userId: number) {
    const assignment = await this.prisma.userRoleAssignment.findFirst({
      where: { userId, roleId },
    });
    if (!assignment) throw new NotFoundException(`Role assignment not found`);

    return this.prisma.userRoleAssignment.delete({
      where: { id: assignment.id },
    });
  }

  private validatePermissionKeys(permissions: string[]) {
    const unknown = permissions.filter(
      (p) => !this.permissionRegistry.isKnownPermission(p),
    );
    if (unknown.length > 0) {
      throw new BadRequestException(
        `Unknown permission keys: ${unknown.join(', ')}`,
      );
    }
  }

  private async checkDelegation(actorUserId: number, permissions: string[]) {
    const actorPerms =
      await this.userPermissionsService.getEffectivePermissions(actorUserId);
    const check = this.permissionRegistry.canDelegateAll(
      actorPerms,
      permissions,
    );

    if (!check.allowed) {
      throw new ForbiddenException(
        `You cannot grant the following permissions: ${check.denied.join(', ')}. ` +
          `You lack the required delegator permissions.`,
      );
    }
  }
}
