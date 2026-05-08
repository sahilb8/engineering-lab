import { Global, Module } from '@nestjs/common';
import { PermissionRegistryService } from './permissions/permission-registry.service';
import { UserPermissionsService } from './permissions/user-permissions.service';
import { FeatureFlagService } from './feature-flags/feature-flag.service';
import { EventBus } from './events/event-bus.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    PermissionRegistryService,
    UserPermissionsService,
    FeatureFlagService,
    EventBus,
  ],
  exports: [
    PermissionRegistryService,
    UserPermissionsService,
    FeatureFlagService,
    EventBus,
  ],
})
export class CoreModule {}
