import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UserPermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getEffectivePermissions(userId: number): Promise<string[]> {
    const assignments = await this.prisma.userRoleAssignment.findMany({
      where: { userId },
      include: { role: true },
    });

    const permissionSet = new Set<string>();
    for (const assignment of assignments) {
      for (const perm of assignment.role.permissions) {
        permissionSet.add(perm);
      }
    }

    return Array.from(permissionSet);
  }
}
