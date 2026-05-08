import { Module, OnModuleInit } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AccountsModule } from '../accounts/accounts.module';
import { PermissionRegistryService } from '../core/permissions/permission-registry.service';
import { transactionsPermissions } from './transactions.permissions';

@Module({
  imports: [PrismaModule, AccountsModule],
  controllers: [TransactionsController],
  providers: [TransactionsService],
})
export class TransactionsModule implements OnModuleInit {
  constructor(private readonly permissionRegistry: PermissionRegistryService) {}

  onModuleInit() {
    this.permissionRegistry.register(transactionsPermissions);
  }
}
