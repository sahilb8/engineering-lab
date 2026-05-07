import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { HouseholdsModule } from './households/households.module';
import { AccountsModule } from './accounts/accounts.module';
import { TransactionsModule } from './transactions/transactions.module';
import { CategoriesModule } from './categories/categories.module';
import { BudgetsModule } from './budgets/budgets.module';
import { BankSyncModule } from './bank-sync/bank-sync.module';
import { FeatureFlagGuard } from './common/guards/feature-flag.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { FakeAuthMiddleware } from './middleware/fake-auth.middleware';
import { CoreModule } from './core/core.module';

@Module({
  imports: [
    CoreModule,
    PrismaModule,
    UsersModule,
    HouseholdsModule,
    AccountsModule,
    TransactionsModule,
    CategoriesModule,
    BudgetsModule,
    BankSyncModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: FeatureFlagGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(FakeAuthMiddleware).forRoutes('*');
  }
}
