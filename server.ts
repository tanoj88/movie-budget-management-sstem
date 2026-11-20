import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { initDatabase } from './server/config/db.ts';
import { errorHandler } from './server/middleware/errorHandler.ts';

import authRoutes from './server/routes/auth.ts';
import movieRoutes from './server/routes/movies.ts';
import genreRoutes from './server/routes/genres.ts';
import directorRoutes from './server/routes/directors.ts';
import castRoutes from './server/routes/cast.ts';
import roleRoutes from './server/routes/roles.ts';
import reviewRoutes from './server/routes/reviews.ts';
import budgetRoutes from './server/routes/budgets.ts';
import collectionRoutes from './server/routes/collections.ts';
import reportRoutes from './server/routes/reports.ts';

dotenv.config();

async function startServer() {
  await initDatabase();

  const app = express();
  const port = Number(process.env.PORT || 3000);

  app.use(cors());
  app.use(express.json({ limit: '2mb' }));

  // Grouped API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/movies', movieRoutes);
  app.use('/api/genres', genreRoutes);
  app.use('/api/directors', directorRoutes);
  app.use('/api/cast', castRoutes);
  app.use('/api/roles', roleRoutes);
  app.use('/api/reviews', reviewRoutes);
  app.use('/api/budgets', budgetRoutes);
  app.use('/api/collections', collectionRoutes);
  app.use('/api/reports', reportRoutes);

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  app.use(errorHandler);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Movie Budget Management System running on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
