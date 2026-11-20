import { Router } from 'express';
import { db, ResultSetHeader } from '../config/db.ts';
import { authenticateToken, AuthRequest } from '../middleware/auth.ts';
import { AppError, asyncHandler } from '../middleware/errorHandler.ts';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const movieId = req.query.movieId ? Number(req.query.movieId) : null;
    const params: any[] = [];
    let where = '';
    if (movieId && Number.isInteger(movieId)) {
      where = 'WHERE r.Movie_ID = ?';
      params.push(movieId);
    }

    const [rows] = await db.execute<any[]>(
      `SELECT r.Review_ID, r.Movie_ID, r.User_ID, r.Rating, r.Review_Text, r.Review_Date,
              m.Title AS Movie_Title,
              u.Name AS User_Name, u.Role AS User_Role
       FROM Review r
       INNER JOIN Movie m ON r.Movie_ID = m.Movie_ID
       INNER JOIN Users u ON r.User_ID = u.User_ID
       ${where}
       ORDER BY r.Review_Date DESC, r.Review_ID DESC`,
      params
    );

    res.json({ reviews: rows });
  })
);

router.post(
  '/',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.user!.userId;
    const movieId = Number(req.body.Movie_ID);
    const rating = Number(req.body.Rating);
    const reviewText = String(req.body.Review_Text || '').trim();
    const today = new Date().toISOString().slice(0, 10);

    if (!Number.isInteger(movieId) || movieId <= 0) {
      throw new AppError('Valid Movie_ID is required.', 400);
    }
    if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
      throw new AppError('Rating must be between 0.0 and 5.0.', 400);
    }
    if (!reviewText) {
      throw new AppError('Review commentary is required.', 400);
    }

    const [movies] = await db.execute<any[]>('SELECT Movie_ID FROM Movie WHERE Movie_ID = ?', [movieId]);
    if (movies.length === 0) {
      throw new AppError('Movie not found.', 404);
    }

    const [existing] = await db.execute<any[]>(
      'SELECT Review_ID FROM Review WHERE Movie_ID = ? AND User_ID = ?',
      [movieId, userId]
    );
    if (existing.length > 0) {
      throw new AppError('You have already reviewed this movie. Edit your existing review instead.', 409);
    }

    const roundedRating = Number(rating.toFixed(1));
    const [result] = await db.execute<ResultSetHeader>(
      'INSERT INTO Review (Movie_ID, User_ID, Rating, Review_Text, Review_Date) VALUES (?, ?, ?, ?, ?)',
      [movieId, userId, roundedRating, reviewText, today]
    );

    const [rows] = await db.execute<any[]>(
      `SELECT r.Review_ID, r.Movie_ID, r.User_ID, r.Rating, r.Review_Text, r.Review_Date,
              u.Name AS User_Name, u.Role AS User_Role
       FROM Review r
       INNER JOIN Users u ON r.User_ID = u.User_ID
       WHERE r.Review_ID = ?`,
      [result.insertId]
    );

    res.status(201).json({ review: rows[0] });
  })
);

router.put(
  '/:id',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    const rating = Number(req.body.Rating);
    const reviewText = String(req.body.Review_Text || '').trim();

    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError('Invalid review ID.', 400);
    }
    if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
      throw new AppError('Rating must be between 0.0 and 5.0.', 400);
    }
    if (!reviewText) {
      throw new AppError('Review commentary is required.', 400);
    }

    const [existing] = await db.execute<any[]>(
      'SELECT Review_ID, User_ID FROM Review WHERE Review_ID = ?',
      [id]
    );
    if (existing.length === 0) {
      throw new AppError('Review not found.', 404);
    }

    if (req.user!.role !== 'Admin' && Number(existing[0].User_ID) !== req.user!.userId) {
      throw new AppError('You can only edit your own reviews.', 403);
    }

    const roundedRating = Number(rating.toFixed(1));
    const today = new Date().toISOString().slice(0, 10);

    await db.execute<ResultSetHeader>(
      'UPDATE Review SET Rating = ?, Review_Text = ?, Review_Date = ? WHERE Review_ID = ?',
      [roundedRating, reviewText, today, id]
    );

    const [rows] = await db.execute<any[]>(
      `SELECT r.Review_ID, r.Movie_ID, r.User_ID, r.Rating, r.Review_Text, r.Review_Date,
              u.Name AS User_Name, u.Role AS User_Role
       FROM Review r
       INNER JOIN Users u ON r.User_ID = u.User_ID
       WHERE r.Review_ID = ?`,
      [id]
    );

    res.json({ review: rows[0] });
  })
);

router.delete(
  '/:id',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError('Invalid review ID.', 400);
    }

    const [existing] = await db.execute<any[]>(
      'SELECT Review_ID, User_ID FROM Review WHERE Review_ID = ?',
      [id]
    );
    if (existing.length === 0) {
      throw new AppError('Review not found.', 404);
    }

    if (req.user!.role !== 'Admin' && Number(existing[0].User_ID) !== req.user!.userId) {
      throw new AppError('You can only delete your own reviews.', 403);
    }

    await db.execute<ResultSetHeader>('DELETE FROM Review WHERE Review_ID = ?', [id]);
    res.json({ message: 'Review deleted successfully.' });
  })
);

export default router;
