import { Module, OnModuleInit } from '@nestjs/common';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ACCOUNTS_SERVICE } from '../core/contracts/accounts-service.contract';
import { PermissionRegistryService } from '../core/permissions/permission-registry.service';
import { accountsPermissions } from './accounts.permissions';

@Module({
  imports: [PrismaModule],
  controllers: [AccountsController],
  providers: [
    {
      provide: ACCOUNTS_SERVICE,
      useClass: AccountsService,
    },
  ],
  exports: [ACCOUNTS_SERVICE],
})
export class AccountsModule implements OnModuleInit {
  constructor(private readonly permissionRegistry: PermissionRegistryService) {}

  onModuleInit() {
    this.permissionRegistry.register(accountsPermissions);
  }
}
