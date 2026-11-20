import { Router } from 'express';
import { db, ResultSetHeader } from '../config/db.ts';
import { authenticateToken, requireAdmin } from '../middleware/auth.ts';
import { AppError, asyncHandler } from '../middleware/errorHandler.ts';

const router = Router();

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const [rows] = await db.execute<any[]>(
      `SELECT b.Budget_ID, b.Movie_ID, b.Production_Cost, b.Marketing_Cost, b.Total_Budget,
              m.Title AS Movie_Title, m.Release_Date, g.Genre_Name,
              COALESCE(col.Total_Collection, 0) AS Total_Collection
       FROM Budget b
       INNER JOIN Movie m ON b.Movie_ID = m.Movie_ID
       LEFT JOIN Genre g ON m.Genre_ID = g.Genre_ID
       LEFT JOIN (
         SELECT Movie_ID, SUM(Total_Collection) AS Total_Collection
         FROM Collection
         GROUP BY Movie_ID
       ) col ON b.Movie_ID = col.Movie_ID
       ORDER BY b.Total_Budget DESC`
    );

    const budgets = rows.map((row) => {
      const totalBudget = Number(row.Total_Budget || 0);
      const totalCollection = Number(row.Total_Collection || 0);
      const variance = totalCollection - totalBudget;
      const collectionStatus =
        totalCollection === 0
          ? 'No Collections'
          : totalCollection > totalBudget
          ? 'Exceeds Budget'
          : totalCollection < totalBudget
          ? 'Below Budget'
          : 'Break-Even';

      return {
        ...row,
        Production_Cost: Number(row.Production_Cost || 0),
        Marketing_Cost: Number(row.Marketing_Cost || 0),
        Total_Budget: totalBudget,
        Total_Collection: totalCollection,
        Variance: variance,
        Collection_Status: collectionStatus,
      };
    });

    const totals = budgets.reduce(
      (acc, b) => {
        acc.production += b.Production_Cost;
        acc.marketing += b.Marketing_Cost;
        acc.totalBudget += b.Total_Budget;
        acc.totalCollection += b.Total_Collection;
        return acc;
      },
      { production: 0, marketing: 0, totalBudget: 0, totalCollection: 0 }
    );

    res.json({ budgets, totals });
  })
);

router.get(
  '/movie/:movieId',
  asyncHandler(async (req, res) => {
    const movieId = Number(req.params.movieId);
    if (!Number.isInteger(movieId) || movieId <= 0) {
      throw new AppError('Invalid movie ID.', 400);
    }

    const [rows] = await db.execute<any[]>(
      'SELECT * FROM Budget WHERE Movie_ID = ?',
      [movieId]
    );
    res.json({ budget: rows[0] || null });
  })
);

router.post(
  '/',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const movieId = Number(req.body.Movie_ID);
    const productionCost = Number(req.body.Production_Cost);
    const marketingCost = Number(req.body.Marketing_Cost);

    if (!Number.isInteger(movieId) || movieId <= 0) {
      throw new AppError('Please select a valid movie.', 400);
    }
    if (!Number.isFinite(productionCost) || productionCost < 0) {
      throw new AppError('Production cost must be a valid non-negative amount.', 400);
    }
    if (!Number.isFinite(marketingCost) || marketingCost < 0) {
      throw new AppError('Marketing cost must be a valid non-negative amount.', 400);
    }

    const [movies] = await db.execute<any[]>('SELECT Movie_ID FROM Movie WHERE Movie_ID = ?', [movieId]);
    if (movies.length === 0) {
      throw new AppError('Selected movie does not exist.', 404);
    }

    const [existing] = await db.execute<any[]>('SELECT Budget_ID FROM Budget WHERE Movie_ID = ?', [movieId]);
    if (existing.length > 0) {
      throw new AppError('A budget already exists for this movie. Edit the existing budget instead.', 409);
    }

    const totalBudget = Number((productionCost + marketingCost).toFixed(2));

    const [result] = await db.execute<ResultSetHeader>(
      'INSERT INTO Budget (Movie_ID, Production_Cost, Marketing_Cost, Total_Budget) VALUES (?, ?, ?, ?)',
      [movieId, productionCost, marketingCost, totalBudget]
    );

    const [rows] = await db.execute<any[]>('SELECT * FROM Budget WHERE Budget_ID = ?', [result.insertId]);
    res.status(201).json({ budget: rows[0] });
  })
);

router.put(
  '/:id',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const productionCost = Number(req.body.Production_Cost);
    const marketingCost = Number(req.body.Marketing_Cost);

    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError('Invalid budget ID.', 400);
    }
    if (!Number.isFinite(productionCost) || productionCost < 0) {
      throw new AppError('Production cost must be a valid non-negative amount.', 400);
    }
    if (!Number.isFinite(marketingCost) || marketingCost < 0) {
      throw new AppError('Marketing cost must be a valid non-negative amount.', 400);
    }

    const totalBudget = Number((productionCost + marketingCost).toFixed(2));

    const [result] = await db.execute<ResultSetHeader>(
      'UPDATE Budget SET Production_Cost = ?, Marketing_Cost = ?, Total_Budget = ? WHERE Budget_ID = ?',
      [productionCost, marketingCost, totalBudget, id]
    );
    if (result.affectedRows === 0) {
      throw new AppError('Budget record not found.', 404);
    }

    const [rows] = await db.execute<any[]>('SELECT * FROM Budget WHERE Budget_ID = ?', [id]);
    res.json({ budget: rows[0] });
  })
);

router.delete(
  '/:id',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError('Invalid budget ID.', 400);
    }

    const [result] = await db.execute<ResultSetHeader>('DELETE FROM Budget WHERE Budget_ID = ?', [id]);
    if (result.affectedRows === 0) {
      throw new AppError('Budget record not found.', 404);
    }

    res.json({ message: 'Budget deleted successfully.' });
  })
);

export default router;
