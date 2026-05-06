import { Global, Module } from '@nestjs/common';
import { PermissionRegistryService } from './permissions/permission-registry.service';
import { FeatureFlagService } from './feature-flags/feature-flag.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [PermissionRegistryService, FeatureFlagService],
  exports: [PermissionRegistryService, FeatureFlagService],
})
export class CoreModule {}
