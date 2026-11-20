import { Router } from 'express';
import { db, ResultSetHeader } from '../config/db.ts';
import { authenticateToken, requireAdmin } from '../middleware/auth.ts';
import { AppError, asyncHandler } from '../middleware/errorHandler.ts';

const router = Router();

function enrichWithCumulativeAndBreakEven(rows: any[]): any[] {
  const runningTotals = new Map<number, number>();
  return rows.map((row) => {
    const movieId = Number(row.Movie_ID);
    const weekTotal = Number(row.Total_Collection || 0);
    const totalBudget = Number(row.Total_Budget || 0);
    const prev = runningTotals.get(movieId) || 0;
    const cumulative = Number((prev + weekTotal).toFixed(2));
    runningTotals.set(movieId, cumulative);

    return {
      ...row,
      Domestic_Collection: Number(row.Domestic_Collection || 0),
      Overseas_Collection: Number(row.Overseas_Collection || 0),
      Total_Collection: weekTotal,
      Total_Budget: totalBudget,
      Cumulative_Collection: cumulative,
      Break_Even_Reached: totalBudget > 0 && cumulative >= totalBudget,
      Break_Even_Percent: totalBudget > 0 ? Number(((cumulative / totalBudget) * 100).toFixed(1)) : null,
    };
  });
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const movieId = req.query.movieId ? Number(req.query.movieId) : null;
    const params: any[] = [];
    let where = '';
    if (movieId && Number.isInteger(movieId)) {
      where = 'WHERE c.Movie_ID = ?';
      params.push(movieId);
    }

    const [rows] = await db.execute<any[]>(
      `SELECT c.Collection_ID, c.Movie_ID, c.Week_Number,
              c.Domestic_Collection, c.Overseas_Collection, c.Total_Collection,
              m.Title AS Movie_Title,
              COALESCE(b.Total_Budget, 0) AS Total_Budget
       FROM Collection c
       INNER JOIN Movie m ON c.Movie_ID = m.Movie_ID
       LEFT JOIN Budget b ON c.Movie_ID = b.Movie_ID
       ${where}
       ORDER BY c.Movie_ID ASC, c.Week_Number ASC`,
      params
    );

    const enriched = enrichWithCumulativeAndBreakEven(rows);
    res.json({ collections: enriched });
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
      `SELECT c.Collection_ID, c.Movie_ID, c.Week_Number,
              c.Domestic_Collection, c.Overseas_Collection, c.Total_Collection,
              m.Title AS Movie_Title,
              COALESCE(b.Total_Budget, 0) AS Total_Budget
       FROM Collection c
       INNER JOIN Movie m ON c.Movie_ID = m.Movie_ID
       LEFT JOIN Budget b ON c.Movie_ID = b.Movie_ID
       WHERE c.Movie_ID = ?
       ORDER BY c.Week_Number ASC`,
      [movieId]
    );

    const enriched = enrichWithCumulativeAndBreakEven(rows);
    res.json({ collections: enriched });
  })
);

router.post(
  '/',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const movieId = Number(req.body.Movie_ID);
    const weekNumber = Number(req.body.Week_Number);
    const domestic = Number(req.body.Domestic_Collection);
    const overseas = Number(req.body.Overseas_Collection);

    if (!Number.isInteger(movieId) || movieId <= 0) {
      throw new AppError('Please select a valid movie.', 400);
    }
    if (!Number.isInteger(weekNumber) || weekNumber < 1) {
      throw new AppError('Week number must be a positive integer (1 or greater).', 400);
    }
    if (!Number.isFinite(domestic) || domestic < 0) {
      throw new AppError('Domestic collection must be a non-negative number.', 400);
    }
    if (!Number.isFinite(overseas) || overseas < 0) {
      throw new AppError('Overseas collection must be a non-negative number.', 400);
    }

    const [movies] = await db.execute<any[]>('SELECT Movie_ID FROM Movie WHERE Movie_ID = ?', [movieId]);
    if (movies.length === 0) {
      throw new AppError('Selected movie does not exist.', 404);
    }

    const [dup] = await db.execute<any[]>(
      'SELECT Collection_ID FROM Collection WHERE Movie_ID = ? AND Week_Number = ?',
      [movieId, weekNumber]
    );
    if (dup.length > 0) {
      throw new AppError(
        `Week ${weekNumber} collection has already been logged for this movie.`,
        409
      );
    }

    const totalCollection = Number((domestic + overseas).toFixed(2));

    const [result] = await db.execute<ResultSetHeader>(
      `INSERT INTO Collection (Movie_ID, Week_Number, Domestic_Collection, Overseas_Collection, Total_Collection)
       VALUES (?, ?, ?, ?, ?)`,
      [movieId, weekNumber, domestic, overseas, totalCollection]
    );

    const [rows] = await db.execute<any[]>(
      'SELECT * FROM Collection WHERE Collection_ID = ?',
      [result.insertId]
    );

    res.status(201).json({ collection: rows[0] });
  })
);

router.put(
  '/:id',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const weekNumber = Number(req.body.Week_Number);
    const domestic = Number(req.body.Domestic_Collection);
    const overseas = Number(req.body.Overseas_Collection);

    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError('Invalid collection ID.', 400);
    }
    if (!Number.isInteger(weekNumber) || weekNumber < 1) {
      throw new AppError('Week number must be a positive integer (1 or greater).', 400);
    }
    if (!Number.isFinite(domestic) || domestic < 0 || !Number.isFinite(overseas) || overseas < 0) {
      throw new AppError('Domestic and overseas collections must be non-negative numbers.', 400);
    }

    const [existing] = await db.execute<any[]>(
      'SELECT Movie_ID FROM Collection WHERE Collection_ID = ?',
      [id]
    );
    if (existing.length === 0) {
      throw new AppError('Collection entry not found.', 404);
    }

    const movieId = existing[0].Movie_ID;
    const [dup] = await db.execute<any[]>(
      'SELECT Collection_ID FROM Collection WHERE Movie_ID = ? AND Week_Number = ? AND Collection_ID <> ?',
      [movieId, weekNumber, id]
    );
    if (dup.length > 0) {
      throw new AppError(
        `Week ${weekNumber} collection already exists for this movie.`,
        409
      );
    }

    const totalCollection = Number((domestic + overseas).toFixed(2));

    await db.execute<ResultSetHeader>(
      `UPDATE Collection
       SET Week_Number = ?, Domestic_Collection = ?, Overseas_Collection = ?, Total_Collection = ?
       WHERE Collection_ID = ?`,
      [weekNumber, domestic, overseas, totalCollection, id]
    );

    const [rows] = await db.execute<any[]>('SELECT * FROM Collection WHERE Collection_ID = ?', [id]);
    res.json({ collection: rows[0] });
  })
);

router.delete(
  '/:id',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError('Invalid collection ID.', 400);
    }

    const [result] = await db.execute<ResultSetHeader>(
      'DELETE FROM Collection WHERE Collection_ID = ?',
      [id]
    );
    if (result.affectedRows === 0) {
      throw new AppError('Collection entry not found.', 404);
    }

    res.json({ message: 'Collection entry deleted successfully.' });
  })
);

export default router;
