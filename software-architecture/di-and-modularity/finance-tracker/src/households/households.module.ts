import { Module, OnModuleInit } from '@nestjs/common';
import { HouseholdsController } from './households.controller';
import { HouseholdsService } from './households.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionRegistryService } from '../core/permissions/permission-registry.service';
import { householdsPermissions } from './households.permissions';

@Module({
  imports: [PrismaModule],
  controllers: [HouseholdsController],
  providers: [HouseholdsService],
})
export class HouseholdsModule implements OnModuleInit {
  constructor(private readonly permissionRegistry: PermissionRegistryService) {}

  onModuleInit() {
    this.permissionRegistry.register(householdsPermissions);
  }
}
