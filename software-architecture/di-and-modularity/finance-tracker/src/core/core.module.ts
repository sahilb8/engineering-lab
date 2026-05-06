import { Global, Module } from '@nestjs/common';
import { PermissionRegistryService } from './permissions/permission-registry.service';

@Global()
@Module({
  providers: [PermissionRegistryService],
  exports: [PermissionRegistryService],
})
export class CoreModule {}
