import { SetMetadata } from '@nestjs/common';

export const REQUIRES_MODULE_KEY = 'requires_module';

export const RequiresModule = (moduleName: string) =>
  SetMetadata(REQUIRES_MODULE_KEY, moduleName);
