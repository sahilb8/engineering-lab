import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { PrismaModule } from '../prisma/prisma.module';
import { HouseholdMiddleware } from '../middleware/household.middleware';

@Module({
  imports: [PrismaModule],
  controllers: [TransactionsController],
  providers: [TransactionsService],
})
export class TransactionsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HouseholdMiddleware).forRoutes(TransactionsController);
  }
}
