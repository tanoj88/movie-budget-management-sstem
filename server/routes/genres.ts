import { Router } from 'express';
import { db, ResultSetHeader } from '../config/db.ts';
import { authenticateToken, requireAdmin } from '../middleware/auth.ts';
import { AppError, asyncHandler } from '../middleware/errorHandler.ts';

const router = Router();

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const [rows] = await db.execute<any[]>(
      `SELECT g.Genre_ID, g.Genre_Name, COUNT(m.Movie_ID) AS Movie_Count
       FROM Genre g
       LEFT JOIN Movie m ON g.Genre_ID = m.Genre_ID
       GROUP BY g.Genre_ID, g.Genre_Name
       ORDER BY g.Genre_Name ASC`
    );
    res.json({ genres: rows });
  })
);

router.post(
  '/',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const genreName = String(req.body.Genre_Name || '').trim();
    if (!genreName || genreName.length > 50) {
      throw new AppError('Genre name is required and must be 50 characters or fewer.', 400);
    }

    const [existing] = await db.execute<any[]>(
      'SELECT Genre_ID FROM Genre WHERE LOWER(Genre_Name) = LOWER(?)',
      [genreName]
    );
    if (existing.length > 0) {
      throw new AppError(`Genre "${genreName}" already exists.`, 409);
    }

    const [result] = await db.execute<ResultSetHeader>(
      'INSERT INTO Genre (Genre_Name) VALUES (?)',
      [genreName]
    );

    res.status(201).json({
      genre: { Genre_ID: result.insertId, Genre_Name: genreName, Movie_Count: 0 },
    });
  })
);

router.put(
  '/:id',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const genreName = String(req.body.Genre_Name || '').trim();
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError('Invalid genre ID.', 400);
    }
    if (!genreName || genreName.length > 50) {
      throw new AppError('Genre name is required and must be 50 characters or fewer.', 400);
    }

    const [existing] = await db.execute<any[]>(
      'SELECT Genre_ID FROM Genre WHERE LOWER(Genre_Name) = LOWER(?) AND Genre_ID <> ?',
      [genreName, id]
    );
    if (existing.length > 0) {
      throw new AppError(`Genre "${genreName}" already exists.`, 409);
    }

    const [result] = await db.execute<ResultSetHeader>(
      'UPDATE Genre SET Genre_Name = ? WHERE Genre_ID = ?',
      [genreName, id]
    );
    if (result.affectedRows === 0) {
      throw new AppError('Genre not found.', 404);
    }

    res.json({ genre: { Genre_ID: id, Genre_Name: genreName } });
  })
);

router.delete(
  '/:id',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError('Invalid genre ID.', 400);
    }

    const [refs] = await db.execute<{ cnt: number }[]>(
      'SELECT COUNT(*) AS cnt FROM Movie WHERE Genre_ID = ?',
      [id]
    );
    if (Number(refs[0]?.cnt || 0) > 0) {
      throw new AppError(
        `Cannot delete genre: it is currently assigned to ${refs[0].cnt} movie(s). Reassign those movies first.`,
        409
      );
    }

    const [result] = await db.execute<ResultSetHeader>(
      'DELETE FROM Genre WHERE Genre_ID = ?',
      [id]
    );
    if (result.affectedRows === 0) {
      throw new AppError('Genre not found.', 404);
    }

    res.json({ message: 'Genre deleted successfully.' });
  })
);

export default router;
