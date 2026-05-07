import { Module, OnModuleInit } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BANK_ADAPTERS } from '../core/contracts/bank-adapter.contract';
import { ChaseAdapter } from './adapters/chase.adapter';
import { WellsFargoAdapter } from './adapters/wells-fargo.adapter';
import { BankAdapterRegistry } from './bank-adapter-registry.service';
import { BankSyncService } from './bank-sync.service';
import { BankSyncController } from './bank-sync.controller';
import { PermissionRegistryService } from '../core/permissions/permission-registry.service';
import { bankSyncPermissions } from './bank-sync.permissions';

@Module({
  imports: [PrismaModule],
  controllers: [BankSyncController],
  providers: [
    ChaseAdapter,
    WellsFargoAdapter,
    {
      provide: BANK_ADAPTERS,
      useFactory: (
        chase: ChaseAdapter,
        wellsFargo: WellsFargoAdapter,
      ) => [chase, wellsFargo],
      inject: [ChaseAdapter, WellsFargoAdapter],
    },
    BankAdapterRegistry,
    BankSyncService,
  ],
  exports: [BankAdapterRegistry],
})
export class BankSyncModule implements OnModuleInit {
  constructor(
    private readonly permissionRegistry: PermissionRegistryService,
  ) {}

  onModuleInit() {
    this.permissionRegistry.register(bankSyncPermissions);
  }
}
