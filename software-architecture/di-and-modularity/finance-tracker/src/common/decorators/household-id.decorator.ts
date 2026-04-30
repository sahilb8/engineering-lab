import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const HouseholdId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): number => {
    const request = ctx.switchToHttp().getRequest<{ householdId: number }>();
    return request.householdId;
  },
);
