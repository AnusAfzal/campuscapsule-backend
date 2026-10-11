import { createApp } from './app';
import { connectDB } from './config/db';
import { env } from './config/env';

const startServer = async (): Promise<void> => {
  const app = createApp();

  // Initialize database connection
  await connectDB();

  const server = app.listen(env.PORT, '0.0.0.0', () => {
    console.log(`===============================================`);
    console.log(`🚀 CampusCapsule Backend Server`);
    console.log(`📡 URL: http://localhost:${env.PORT}`);
    console.log(`🩺 Health: http://localhost:${env.PORT}${env.API_PREFIX}/health`);
    console.log(`🌍 Environment: ${env.NODE_ENV}`);
    console.log(`===============================================`);
  });

  const gracefulShutdown = (signal: string) => {
    console.log(`[Server] Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
      console.log('[Server] HTTP connections closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
};

startServer().catch((error) => {
  console.error('[Server Error] Startup failed:', error);
  process.exit(1);
});