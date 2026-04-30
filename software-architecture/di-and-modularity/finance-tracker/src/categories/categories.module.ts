import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { PrismaModule } from '../prisma/prisma.module';
import { FakeAuthMiddleware } from '../middleware/fake-auth.middleware';

@Module({
  imports: [PrismaModule],
  controllers: [CategoriesController],
  providers: [CategoriesService],
})
export class CategoriesModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(FakeAuthMiddleware).forRoutes(CategoriesController);
  }
}
