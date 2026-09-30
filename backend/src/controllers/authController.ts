import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../dataSource';
import { User } from '../entities/User';
import { Shop } from '../entities/Shop';

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({
      where: { email: email.toLowerCase().trim() },
      relations: { shop: true },
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const secret = process.env.JWT_SECRET || 'slotify_secret_key';
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      shopId: user.shopId || (user.shop ? user.shop.id : null),
    };

    const token = jwt.sign(payload, secret, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        shopId: payload.shopId,
        shop: user.shop
          ? {
              id: user.shop.id,
              name: user.shop.name,
              category: user.shop.category,
              area: user.shop.area,
              phone: user.shop.phone,
              workingHoursStart: user.shop.workingHoursStart,
              workingHoursEnd: user.shop.workingHoursEnd,
              slotDurationMinutes: user.shop.slotDurationMinutes,
            }
          : null,
      },
    });
  } catch (error: any) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
}

export async function getMe(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({
      where: { id: req.user.id },
      relations: { shop: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      shopId: user.shopId || (user.shop ? user.shop.id : null),
      shop: user.shop
        ? {
            id: user.shop.id,
            name: user.shop.name,
            category: user.shop.category,
            area: user.shop.area,
            phone: user.shop.phone,
            workingHoursStart: user.shop.workingHoursStart,
            workingHoursEnd: user.shop.workingHoursEnd,
            slotDurationMinutes: user.shop.slotDurationMinutes,
          }
        : null,
    });
  } catch (error: any) {
    console.error('Error getting current user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
