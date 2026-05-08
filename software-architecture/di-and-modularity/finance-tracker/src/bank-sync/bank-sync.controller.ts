import { Controller, Post, Param, Body, ParseIntPipe, Get } from '@nestjs/common';
import { BankSyncService } from './bank-sync.service';
import { BankAdapterRegistry } from './bank-adapter-registry.service';
import { HouseholdId } from '../common/decorators/household-id.decorator';
import { RequiresModule } from '../common/decorators/requires-module.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { BANK_SYNC_EXECUTE, BANK_SYNC_READ } from './bank-sync.permissions';

@Controller('accounts')
@RequiresModule('bank-sync')
export class BankSyncController {
  constructor(
    private readonly bankSyncService: BankSyncService,
    private readonly adapterRegistry: BankAdapterRegistry,
  ) {}

  @Post(':id/sync')
  @Permissions(BANK_SYNC_EXECUTE)
  sync(
    @HouseholdId() householdId: number,
    @Param('id', ParseIntPipe) accountId: number,
    @Body() body?: { from?: string; to?: string },
  ) {
    return this.bankSyncService.syncTransactions(
      householdId,
      accountId,
      body?.from && body?.to ? { from: body.from, to: body.to } : undefined,
    );
  }

  @Get('sync/adapters')
  @Permissions(BANK_SYNC_READ)
  listAdapters() {
    return { availableAdapters: this.adapterRegistry.getSupportedBanks() };
  }
}
