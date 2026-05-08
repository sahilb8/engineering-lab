import { Module, OnModuleInit } from '@nestjs/common';
import { BudgetsController } from './budgets.controller';
import { BudgetsService } from './budgets.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionRegistryService } from '../core/permissions/permission-registry.service';
import { EventBus } from '../core/events/event-bus.service';
import { budgetsPermissions } from './budgets.permissions';
import { TransactionCreatedListener } from './listeners/transaction-created.listener';
import { TRANSACTION_CREATED } from '../transactions/events/transaction-created.event';

@Module({
  imports: [PrismaModule],
  controllers: [BudgetsController],
  providers: [BudgetsService, TransactionCreatedListener],
})
export class BudgetsModule implements OnModuleInit {
  constructor(
    private readonly permissionRegistry: PermissionRegistryService,
    private readonly eventBus: EventBus,
    private readonly transactionCreatedListener: TransactionCreatedListener,
  ) {}

  onModuleInit() {
    this.permissionRegistry.register(budgetsPermissions);
    this.eventBus.subscribe(TRANSACTION_CREATED, {
      moduleName: 'budgets',
      handler: (event) => this.transactionCreatedListener.handle(event),
    });
  }
}
