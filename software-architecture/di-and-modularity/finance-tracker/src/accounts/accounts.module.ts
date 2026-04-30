import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { PrismaModule } from '../prisma/prisma.module';
import { HouseholdMiddleware } from '../middleware/household.middleware';

@Module({
  imports: [PrismaModule],
  controllers: [AccountsController],
  providers: [AccountsService],
})
export class AccountsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HouseholdMiddleware).forRoutes(AccountsController);
  }
}
