import { Global, Module } from '@nestjs/common';
import { PermissionRegistryService } from './permissions/permission-registry.service';
import { FeatureFlagService } from './feature-flags/feature-flag.service';
import { EventBus } from './events/event-bus.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [PermissionRegistryService, FeatureFlagService, EventBus],
  exports: [PermissionRegistryService, FeatureFlagService, EventBus],
})
export class CoreModule {}
