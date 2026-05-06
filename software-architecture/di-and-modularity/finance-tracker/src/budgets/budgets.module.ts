import { Module, OnModuleInit } from '@nestjs/common';
import { BudgetsController } from './budgets.controller';
import { BudgetsService } from './budgets.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionRegistryService } from '../core/permissions/permission-registry.service';
import { budgetsPermissions } from './budgets.permissions';

@Module({
  imports: [PrismaModule],
  controllers: [BudgetsController],
  providers: [BudgetsService],
})
export class BudgetsModule implements OnModuleInit {
  constructor(private readonly permissionRegistry: PermissionRegistryService) {}

  onModuleInit() {
    this.permissionRegistry.register(budgetsPermissions);
  }
}
