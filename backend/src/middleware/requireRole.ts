import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../entities/User';

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized: User not authenticated' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Forbidden: Requires one of roles: [${allowedRoles.join(', ')}]`,
      });
      return;
    }

    next();
  };
}
