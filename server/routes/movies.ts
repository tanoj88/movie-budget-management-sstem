import { Router } from 'express';
import { db, ResultSetHeader } from '../config/db.ts';
import { authenticateToken, requireAdmin } from '../middleware/auth.ts';
import { AppError, asyncHandler } from '../middleware/errorHandler.ts';

const router = Router();

const SORT_COLUMNS: Record<string, string> = {
  title: 'm.Title',
  releaseDate: 'm.Release_Date',
  duration: 'm.Duration',
  budget: 'Total_Budget',
  collection: 'Total_Collection',
  rating: 'Avg_Rating',
};

router.get(
  '/all',
  asyncHandler(async (_req, res) => {
    const [rows] = await db.execute<any[]>(
      `SELECT m.Movie_ID, m.Title, m.Release_Date, g.Genre_Name
       FROM Movie m
       LEFT JOIN Genre g ON m.Genre_ID = g.Genre_ID
       ORDER BY m.Title ASC`
    );
    res.json({ movies: rows });
  })
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || '').trim();
    const genreId = req.query.genreId ? Number(req.query.genreId) : null;
    const directorId = req.query.directorId ? Number(req.query.directorId) : null;
    const language = String(req.query.language || '').trim();
    const year = String(req.query.year || '').trim();
    const sortBy = String(req.query.sortBy || 'releaseDate');
    const sortOrder = String(req.query.sortOrder || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 10)));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];

    if (q) {
      conditions.push('m.Title LIKE ?');
      params.push(`%${q}%`);
    }
    if (genreId && Number.isInteger(genreId)) {
      conditions.push('m.Genre_ID = ?');
      params.push(genreId);
    }
    if (directorId && Number.isInteger(directorId)) {
      conditions.push('m.Director_ID = ?');
      params.push(directorId);
    }
    if (language) {
      conditions.push('m.Language = ?');
      params.push(language);
    }
    if (year && /^\d{4}$/.test(year)) {
      conditions.push('SUBSTR(m.Release_Date, 1, 4) = ?');
      params.push(year);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderColumn = SORT_COLUMNS[sortBy] || 'm.Release_Date';

    const [countRows] = await db.execute<{ total: number }[]>(
      `SELECT COUNT(*) AS total FROM Movie m ${whereClause}`,
      params
    );
    const total = Number(countRows[0]?.total || 0);

    const [rows] = await db.query<any[]>(
      `SELECT m.Movie_ID, m.Title, m.Genre_ID, m.Director_ID, m.Language,
              m.Release_Date, m.Duration, m.Description, m.Poster_URL,
              g.Genre_Name,
              d.Name AS Director_Name,
              COALESCE(b.Production_Cost, 0) AS Production_Cost,
              COALESCE(b.Marketing_Cost, 0) AS Marketing_Cost,
              COALESCE(b.Total_Budget, 0) AS Total_Budget,
              COALESCE(col.Total_Collection, 0) AS Total_Collection,
              COALESCE(rev.Avg_Rating, 0) AS Avg_Rating,
              COALESCE(rev.Review_Count, 0) AS Review_Count
       FROM Movie m
       LEFT JOIN Genre g ON m.Genre_ID = g.Genre_ID
       LEFT JOIN Director d ON m.Director_ID = d.Director_ID
       LEFT JOIN Budget b ON m.Movie_ID = b.Movie_ID
       LEFT JOIN (
         SELECT Movie_ID, SUM(Total_Collection) AS Total_Collection
         FROM Collection
         GROUP BY Movie_ID
       ) col ON m.Movie_ID = col.Movie_ID
       LEFT JOIN (
         SELECT Movie_ID, AVG(Rating) AS Avg_Rating, COUNT(*) AS Review_Count
         FROM Review
         GROUP BY Movie_ID
       ) rev ON m.Movie_ID = rev.Movie_ID
       ${whereClause}
       ORDER BY ${orderColumn} ${sortOrder}, m.Movie_ID DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [langRows] = await db.execute<{ Language: string }[]>(
      "SELECT DISTINCT Language FROM Movie WHERE Language IS NOT NULL AND Language <> '' ORDER BY Language ASC"
    );
    const [yearRows] = await db.execute<{ Yr: string }[]>(
      "SELECT DISTINCT SUBSTR(Release_Date, 1, 4) AS Yr FROM Movie WHERE Release_Date IS NOT NULL ORDER BY Yr DESC"
    );

    res.json({
      movies: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      filters: {
        languages: langRows.map((r) => r.Language),
        years: yearRows.map((r) => r.Yr),
      },
    });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError('Invalid movie ID.', 400);
    }

    const [movieRows] = await db.execute<any[]>(
      `SELECT m.*, g.Genre_Name,
              d.Name AS Director_Name, d.Photo_URL AS Director_Photo_URL, d.Bio AS Director_Bio
       FROM Movie m
       LEFT JOIN Genre g ON m.Genre_ID = g.Genre_ID
       LEFT JOIN Director d ON m.Director_ID = d.Director_ID
       WHERE m.Movie_ID = ?`,
      [id]
    );

    if (movieRows.length === 0) {
      throw new AppError('Movie not found.', 404);
    }
    const movie = movieRows[0];

    const [roles] = await db.execute<any[]>(
      `SELECT mr.Role_ID, mr.Movie_ID, mr.Cast_ID, mr.Role_Name,
              c.Name AS Cast_Name, c.Gender, c.Photo_URL AS Cast_Photo_URL
       FROM Movie_Role mr
       INNER JOIN Movie_Cast c ON mr.Cast_ID = c.Cast_ID
       WHERE mr.Movie_ID = ?
       ORDER BY mr.Role_ID ASC`,
      [id]
    );

    const [budgetRows] = await db.execute<any[]>(
      'SELECT * FROM Budget WHERE Movie_ID = ?',
      [id]
    );
    const budget = budgetRows[0] || null;
    const totalBudget = budget ? Number(budget.Total_Budget) : 0;

    const [collectionRows] = await db.execute<any[]>(
      `SELECT * FROM Collection WHERE Movie_ID = ? ORDER BY Week_Number ASC`,
      [id]
    );

    let cumulative = 0;
    const collections = collectionRows.map((row) => {
      cumulative += Number(row.Total_Collection || 0);
      return {
        ...row,
        Cumulative_Collection: cumulative,
        Break_Even_Reached: totalBudget > 0 && cumulative >= totalBudget,
      };
    });

    const totalCollection = cumulative;
    const profitLoss = totalCollection - totalBudget;
    const roi = totalBudget > 0 ? (profitLoss / totalBudget) * 100 : null;
    const status =
      roi === null ? 'Unbudgeted' : roi > 50 ? 'Hit' : roi < 0 ? 'Flop' : 'Average';

    const [reviews] = await db.execute<any[]>(
      `SELECT r.Review_ID, r.Movie_ID, r.User_ID, r.Rating, r.Review_Text, r.Review_Date,
              u.Name AS User_Name, u.Role AS User_Role
       FROM Review r
       INNER JOIN Users u ON r.User_ID = u.User_ID
       WHERE r.Movie_ID = ?
       ORDER BY r.Review_Date DESC, r.Review_ID DESC`,
      [id]
    );

    const avgRating =
      reviews.length > 0
        ? Number(
            (
              reviews.reduce((sum, r) => sum + Number(r.Rating || 0), 0) / reviews.length
            ).toFixed(2)
          )
        : 0;

    res.json({
      movie,
      cast: roles,
      budget,
      collections,
      financials: {
        totalBudget,
        totalCollection,
        profitLoss,
        roi,
        status,
        breakEvenReached: totalBudget > 0 && totalCollection >= totalBudget,
      },
      reviews,
      ratingSummary: {
        average: avgRating,
        count: reviews.length,
      },
    });
  })
);

router.post(
  '/',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const title = String(req.body.Title || '').trim();
    const genreId = req.body.Genre_ID ? Number(req.body.Genre_ID) : null;
    const directorId = req.body.Director_ID ? Number(req.body.Director_ID) : null;
    const language = req.body.Language ? String(req.body.Language).trim() : null;
    const releaseDate = req.body.Release_Date ? String(req.body.Release_Date).trim() : null;
    const duration = req.body.Duration ? Number(req.body.Duration) : null;
    const description = req.body.Description ? String(req.body.Description).trim() : null;
    const posterUrl = req.body.Poster_URL ? String(req.body.Poster_URL).trim() : null;

    if (!title || title.length > 150) {
      throw new AppError('Movie title is required (max 150 characters).', 400);
    }
    if (duration !== null && (!Number.isFinite(duration) || duration <= 0)) {
      throw new AppError('Duration must be a positive number of minutes.', 400);
    }

    const [result] = await db.execute<ResultSetHeader>(
      `INSERT INTO Movie (Title, Genre_ID, Director_ID, Language, Release_Date, Duration, Description, Poster_URL)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, genreId, directorId, language, releaseDate, duration, description, posterUrl]
    );

    const [rows] = await db.execute<any[]>(
      'SELECT * FROM Movie WHERE Movie_ID = ?',
      [result.insertId]
    );
    res.status(201).json({ movie: rows[0] });
  })
);

router.put(
  '/:id',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError('Invalid movie ID.', 400);
    }

    const title = String(req.body.Title || '').trim();
    const genreId = req.body.Genre_ID ? Number(req.body.Genre_ID) : null;
    const directorId = req.body.Director_ID ? Number(req.body.Director_ID) : null;
    const language = req.body.Language ? String(req.body.Language).trim() : null;
    const releaseDate = req.body.Release_Date ? String(req.body.Release_Date).trim() : null;
    const duration = req.body.Duration ? Number(req.body.Duration) : null;
    const description = req.body.Description ? String(req.body.Description).trim() : null;
    const posterUrl = req.body.Poster_URL ? String(req.body.Poster_URL).trim() : null;

    if (!title || title.length > 150) {
      throw new AppError('Movie title is required (max 150 characters).', 400);
    }
    if (duration !== null && (!Number.isFinite(duration) || duration <= 0)) {
      throw new AppError('Duration must be a positive number of minutes.', 400);
    }

    const [result] = await db.execute<ResultSetHeader>(
      `UPDATE Movie
       SET Title = ?, Genre_ID = ?, Director_ID = ?, Language = ?, Release_Date = ?, Duration = ?, Description = ?, Poster_URL = ?
       WHERE Movie_ID = ?`,
      [title, genreId, directorId, language, releaseDate, duration, description, posterUrl, id]
    );
    if (result.affectedRows === 0) {
      throw new AppError('Movie not found.', 404);
    }

    const [rows] = await db.execute<any[]>('SELECT * FROM Movie WHERE Movie_ID = ?', [id]);
    res.json({ movie: rows[0] });
  })
);

router.delete(
  '/:id',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError('Invalid movie ID.', 400);
    }

    const [budgetRefs] = await db.execute<{ cnt: number }[]>(
      'SELECT COUNT(*) AS cnt FROM Budget WHERE Movie_ID = ?',
      [id]
    );
    const [colRefs] = await db.execute<{ cnt: number }[]>(
      'SELECT COUNT(*) AS cnt FROM Collection WHERE Movie_ID = ?',
      [id]
    );
    const [roleRefs] = await db.execute<{ cnt: number }[]>(
      'SELECT COUNT(*) AS cnt FROM Movie_Role WHERE Movie_ID = ?',
      [id]
    );
    const [revRefs] = await db.execute<{ cnt: number }[]>(
      'SELECT COUNT(*) AS cnt FROM Review WHERE Movie_ID = ?',
      [id]
    );

    const linked: string[] = [];
    if (Number(budgetRefs[0]?.cnt || 0) > 0) linked.push('budget');
    if (Number(colRefs[0]?.cnt || 0) > 0) linked.push('weekly collections');
    if (Number(roleRefs[0]?.cnt || 0) > 0) linked.push('cast roles');
    if (Number(revRefs[0]?.cnt || 0) > 0) linked.push('reviews');

    if (linked.length > 0) {
      throw new AppError(
        `Cannot delete movie: it is referenced by ${linked.join(', ')}. Remove those linked records first.`,
        409
      );
    }

    const [result] = await db.execute<ResultSetHeader>('DELETE FROM Movie WHERE Movie_ID = ?', [id]);
    if (result.affectedRows === 0) {
      throw new AppError('Movie not found.', 404);
    }

    res.json({ message: 'Movie deleted successfully.' });
  })
);

export default router;
