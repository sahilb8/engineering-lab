import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class FakeAuthMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    req['user'] = {
      id: 1,
      householdId: 1,
      role: 'OWNER',
    };
    next();
  }
}
