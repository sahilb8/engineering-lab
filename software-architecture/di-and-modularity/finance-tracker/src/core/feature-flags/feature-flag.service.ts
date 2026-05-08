import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FeatureFlagService {
  constructor(private readonly prisma: PrismaService) {}

  async isModuleEnabled(
    householdId: number,
    moduleName: string,
  ): Promise<boolean> {
    const flag = await this.prisma.featureFlag.findUnique({
      where: { householdId_moduleName: { householdId, moduleName } },
    });

    // No row = no explicit opt-in = disabled (fail-closed for optional modules)
    if (!flag) return false;

    return flag.isEnabled;
  }
}
