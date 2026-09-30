import 'reflect-metadata';
import http from 'http';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { AppDataSource } from './dataSource';
import { initSocketServer } from './sockets';
import authRoutes from './routes/authRoutes';
import shopRoutes from './routes/shopRoutes';
import adminRoutes from './routes/adminRoutes';

dotenv.config();

const app = express();
const httpServer = http.createServer(app);

// Middlewares
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

// Request logger (quiets local IDE / container heartbeat pings)
app.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.path !== '/' && req.path !== '/favicon.ico') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  }
  next();
});

// Root service info endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    service: 'Slotify Real-time Availability API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      publicShops: '/shops',
      shopStatus: '/shops/:id/status',
      auth: '/auth/login',
    },
  });
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Slotify API',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Mount modular routes
app.use('/auth', authRoutes);
app.use('/shops', shopRoutes);
app.use('/admin', adminRoutes);

// Customer static one-page web application
const customerWebPath = path.join(__dirname, '..', '..', 'customer-web');
app.use('/live', express.static(customerWebPath));

// Catch-all 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Server Error]:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// Initialize Socket.io on the exact same HTTP server instance
initSocketServer(httpServer);

const PORT = parseInt(process.env.PORT || '5000', 10);

async function startServer() {
  try {
    console.log('[Database] Connecting to PostgreSQL via TypeORM...');
    await AppDataSource.initialize();
    console.log('[Database] Connection established successfully.');

    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`===============================================`);
      console.log(`🚀 Slotify Express API running on port ${PORT}`);
      console.log(`📡 Socket.io attached and ready on port ${PORT}`);
      console.log(`👉 Health check: http://localhost:${PORT}/health`);
      console.log(`===============================================`);
    });
  } catch (error) {
    console.error('[Startup] Failed to start server:', error);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { app, httpServer };
