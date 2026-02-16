import Fastify from 'fastify';
import cors from '@fastify/cors';
import { proxyRoutes } from './routes/proxy';

export async function buildApp() {
  const app = Fastify({ logger: true });

  // CORS - hanya izinkan frontend untuk mengakses
  await app.register(cors, {
    origin: process.env['ALLOWED_ORIGIN'] || 'http://localhost:4200',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Register routes
  await app.register(proxyRoutes, { prefix: '/api' });

  // Health check
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  return app;
}
