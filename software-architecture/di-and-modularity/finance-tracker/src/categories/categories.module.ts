import { Module, OnModuleInit } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionRegistryService } from '../core/permissions/permission-registry.service';
import { categoriesPermissions } from './categories.permissions';

@Module({
  imports: [PrismaModule],
  controllers: [CategoriesController],
  providers: [CategoriesService],
})
export class CategoriesModule implements OnModuleInit {
  constructor(private readonly permissionRegistry: PermissionRegistryService) {}

  onModuleInit() {
    this.permissionRegistry.register(categoriesPermissions);
  }
}
