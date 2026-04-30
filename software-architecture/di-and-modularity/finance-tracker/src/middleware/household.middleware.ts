import {
  Injectable,
  NestMiddleware,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class HouseholdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const householdId = req.headers['x-household-id'];

    if (!householdId) {
      throw new BadRequestException('x-household-id header is required');
    }

    const parsed = Number(householdId);

    if (isNaN(parsed)) {
      throw new BadRequestException('x-household-id must be a valid number');
    }

    req['householdId'] = parsed;
    next();
  }
}
