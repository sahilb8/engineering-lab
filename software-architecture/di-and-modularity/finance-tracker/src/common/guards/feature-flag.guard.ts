import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRES_MODULE_KEY } from '../decorators/requires-module.decorator';
import { FeatureFlagService } from '../../core/feature-flags/feature-flag.service';

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private featureFlagService: FeatureFlagService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check handler first, then fall back to controller-level decorator
    const moduleName =
      this.reflector.get<string>(REQUIRES_MODULE_KEY, context.getHandler()) ??
      this.reflector.get<string>(REQUIRES_MODULE_KEY, context.getClass());

    // No @RequiresModule() — no feature flag check needed
    if (!moduleName) return true;

    const request = context
      .switchToHttp()
      .getRequest<{ user: { householdId: number } }>();
    const householdId = request.user.householdId;

    const isEnabled = await this.featureFlagService.isModuleEnabled(
      householdId,
      moduleName,
    );

    if (!isEnabled) {
      throw new ForbiddenException(
        `The "${moduleName}" module is not enabled for your household`,
      );
    }

    return true;
  }
}
