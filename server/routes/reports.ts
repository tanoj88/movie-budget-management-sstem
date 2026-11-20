import { Router } from 'express';
import { db } from '../config/db.ts';
import { asyncHandler } from '../middleware/errorHandler.ts';

const router = Router();

function getStatus(roi: number | null): 'Hit' | 'Average' | 'Flop' | 'Unbudgeted' {
  if (roi === null) return 'Unbudgeted';
  if (roi > 50) return 'Hit';
  if (roi < 0) return 'Flop';
  return 'Average';
}

function escapeCsvCell(val: unknown): string {
  const s = val === null || val === undefined ? '' : String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsv(headers: string[], rows: Array<Record<string, unknown>>, keys: string[]): string {
  const lines = [headers.map(escapeCsvCell).join(',')];
  for (const row of rows) {
    lines.push(keys.map((k) => escapeCsvCell(row[k])).join(','));
  }
  return lines.join('\n');
}

router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const selectedMovieId = req.query.movieId ? Number(req.query.movieId) : null;

    const [movieTotals] = await db.execute<any[]>(
      `SELECT COUNT(*) AS totalMovies FROM Movie`
    );
    const [budgetTotals] = await db.execute<any[]>(
      `SELECT COALESCE(SUM(Total_Budget), 0) AS totalBudget FROM Budget`
    );
    const [collectionTotals] = await db.execute<any[]>(
      `SELECT COALESCE(SUM(Total_Collection), 0) AS totalCollection FROM Collection`
    );
    const [ratingTotals] = await db.execute<any[]>(
      `SELECT COALESCE(AVG(Rating), 0) AS avgRating, COUNT(*) AS totalReviews FROM Review`
    );

    const totalMovies = Number(movieTotals[0]?.totalMovies || 0);
    const totalBudget = Number(budgetTotals[0]?.totalBudget || 0);
    const totalCollection = Number(collectionTotals[0]?.totalCollection || 0);
    const totalProfitLoss = totalCollection - totalBudget;
    const avgRating = Number(Number(ratingTotals[0]?.avgRating || 0).toFixed(2));

    const [budgetVsCollection] = await db.execute<any[]>(
      `SELECT m.Movie_ID, m.Title,
              COALESCE(b.Total_Budget, 0) AS Total_Budget,
              COALESCE(col.Total_Collection, 0) AS Total_Collection
       FROM Movie m
       LEFT JOIN Budget b ON m.Movie_ID = b.Movie_ID
       LEFT JOIN (
         SELECT Movie_ID, SUM(Total_Collection) AS Total_Collection
         FROM Collection
         GROUP BY Movie_ID
       ) col ON m.Movie_ID = col.Movie_ID
       ORDER BY m.Movie_ID ASC`
    );

    const [genreCollections] = await db.execute<any[]>(
      `SELECT g.Genre_ID, g.Genre_Name,
              COALESCE(SUM(col.Total_Collection), 0) AS Total_Collection
       FROM Genre g
       LEFT JOIN Movie m ON g.Genre_ID = m.Genre_ID
       LEFT JOIN (
         SELECT Movie_ID, SUM(Total_Collection) AS Total_Collection
         FROM Collection
         GROUP BY Movie_ID
       ) col ON m.Movie_ID = col.Movie_ID
       GROUP BY g.Genre_ID, g.Genre_Name
       HAVING COALESCE(SUM(col.Total_Collection), 0) > 0
       ORDER BY Total_Collection DESC`
    );

    const [movieFinancials] = await db.execute<any[]>(
      `SELECT m.Movie_ID, m.Title, g.Genre_Name,
              COALESCE(b.Total_Budget, 0) AS Total_Budget,
              COALESCE(col.Total_Collection, 0) AS Total_Collection,
              (COALESCE(col.Total_Collection, 0) - COALESCE(b.Total_Budget, 0)) AS Profit_Loss
       FROM Movie m
       LEFT JOIN Genre g ON m.Genre_ID = g.Genre_ID
       LEFT JOIN Budget b ON m.Movie_ID = b.Movie_ID
       LEFT JOIN (
         SELECT Movie_ID, SUM(Total_Collection) AS Total_Collection
         FROM Collection
         GROUP BY Movie_ID
       ) col ON m.Movie_ID = col.Movie_ID
       ORDER BY Profit_Loss DESC
       LIMIT 5`
    );

    const topProfitable = movieFinancials.map((row) => {
      const budget = Number(row.Total_Budget || 0);
      const collection = Number(row.Total_Collection || 0);
      const profit = Number(row.Profit_Loss || 0);
      const roi = budget > 0 ? Number(((profit / budget) * 100).toFixed(2)) : null;
      return {
        ...row,
        Total_Budget: budget,
        Total_Collection: collection,
        Profit_Loss: profit,
        ROI: roi,
        Status: getStatus(roi),
      };
    });

    const [movieOptions] = await db.execute<any[]>(
      `SELECT m.Movie_ID, m.Title
       FROM Movie m
       INNER JOIN Collection c ON m.Movie_ID = c.Movie_ID
       GROUP BY m.Movie_ID, m.Title
       ORDER BY m.Movie_ID ASC`
    );

    const trendMovieId =
      selectedMovieId && movieOptions.some((m) => Number(m.Movie_ID) === selectedMovieId)
        ? selectedMovieId
        : movieOptions[0]?.Movie_ID || null;

    let weeklyTrend: any[] = [];
    if (trendMovieId) {
      const [trendRows] = await db.execute<any[]>(
        `SELECT Week_Number, Domestic_Collection, Overseas_Collection, Total_Collection
         FROM Collection
         WHERE Movie_ID = ?
         ORDER BY Week_Number ASC`,
        [trendMovieId]
      );
      let cumulative = 0;
      weeklyTrend = trendRows.map((r) => {
        const total = Number(r.Total_Collection || 0);
        cumulative += total;
        return {
          Week: `Week ${r.Week_Number}`,
          Week_Number: Number(r.Week_Number),
          Domestic: Number(r.Domestic_Collection || 0),
          Overseas: Number(r.Overseas_Collection || 0),
          Total: total,
          Cumulative: cumulative,
        };
      });
    }

    res.json({
      summary: {
        totalMovies,
        totalBudget,
        totalCollection,
        totalProfitLoss,
        avgRating,
        totalReviews: Number(ratingTotals[0]?.totalReviews || 0),
      },
      budgetVsCollection: budgetVsCollection.map((r) => ({
        Movie_ID: r.Movie_ID,
        Title: r.Title,
        Total_Budget: Number(r.Total_Budget || 0),
        Total_Collection: Number(r.Total_Collection || 0),
      })),
      genreCollections: genreCollections.map((r) => ({
        Genre_ID: r.Genre_ID,
        Genre_Name: r.Genre_Name,
        Total_Collection: Number(r.Total_Collection || 0),
      })),
      topProfitable,
      weeklyTrend,
      trendMovieId,
      movieOptions,
    });
  })
);

router.get(
  '/profitability',
  asyncHandler(async (req, res) => {
    const [rows] = await db.execute<any[]>(
      `SELECT m.Movie_ID, m.Title, m.Language, m.Release_Date,
              g.Genre_Name, d.Name AS Director_Name,
              COALESCE(b.Production_Cost, 0) AS Production_Cost,
              COALESCE(b.Marketing_Cost, 0) AS Marketing_Cost,
              COALESCE(b.Total_Budget, 0) AS Total_Budget,
              COALESCE(col.Total_Collection, 0) AS Total_Collection,
              COALESCE(rev.Avg_Rating, 0) AS Avg_Rating
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
         SELECT Movie_ID, AVG(Rating) AS Avg_Rating
         FROM Review
         GROUP BY Movie_ID
       ) rev ON m.Movie_ID = rev.Movie_ID
       ORDER BY (COALESCE(col.Total_Collection, 0) - COALESCE(b.Total_Budget, 0)) DESC`
    );

    const report = rows.map((r) => {
      const budget = Number(r.Total_Budget || 0);
      const collection = Number(r.Total_Collection || 0);
      const profitLoss = Number((collection - budget).toFixed(2));
      const roi = budget > 0 ? Number(((profitLoss / budget) * 100).toFixed(2)) : null;
      return {
        Movie_ID: r.Movie_ID,
        Title: r.Title,
        Genre_Name: r.Genre_Name || '—',
        Director_Name: r.Director_Name || '—',
        Language: r.Language || '—',
        Release_Date: r.Release_Date || '—',
        Production_Cost: Number(r.Production_Cost || 0),
        Marketing_Cost: Number(r.Marketing_Cost || 0),
        Total_Budget: budget,
        Total_Collection: collection,
        Profit_Loss: profitLoss,
        ROI: roi,
        Status: getStatus(roi),
        Avg_Rating: Number(Number(r.Avg_Rating || 0).toFixed(1)),
      };
    });

    if (req.query.format === 'csv') {
      const csv = toCsv(
        [
          'Movie ID',
          'Title',
          'Genre',
          'Director',
          'Language',
          'Release Date',
          'Total Budget',
          'Total Collection',
          'Profit / Loss',
          'ROI (%)',
          'Status',
          'Avg Rating',
        ],
        report,
        [
          'Movie_ID',
          'Title',
          'Genre_Name',
          'Director_Name',
          'Language',
          'Release_Date',
          'Total_Budget',
          'Total_Collection',
          'Profit_Loss',
          'ROI',
          'Status',
          'Avg_Rating',
        ]
      );
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="movie-profitability-report.csv"');
      res.send(csv);
      return;
    }

    res.json({ report });
  })
);

router.get(
  '/genres',
  asyncHandler(async (req, res) => {
    const [rows] = await db.execute<any[]>(
      `SELECT g.Genre_ID, g.Genre_Name,
              COUNT(DISTINCT m.Movie_ID) AS Movie_Count,
              COALESCE(SUM(b.Total_Budget), 0) AS Total_Budget,
              COALESCE(SUM(col.Total_Collection), 0) AS Total_Collection,
              COALESCE(AVG(rev.Avg_Rating), 0) AS Avg_Rating
       FROM Genre g
       LEFT JOIN Movie m ON g.Genre_ID = m.Genre_ID
       LEFT JOIN Budget b ON m.Movie_ID = b.Movie_ID
       LEFT JOIN (
         SELECT Movie_ID, SUM(Total_Collection) AS Total_Collection
         FROM Collection
         GROUP BY Movie_ID
       ) col ON m.Movie_ID = col.Movie_ID
       LEFT JOIN (
         SELECT Movie_ID, AVG(Rating) AS Avg_Rating
         FROM Review
         GROUP BY Movie_ID
       ) rev ON m.Movie_ID = rev.Movie_ID
       GROUP BY g.Genre_ID, g.Genre_Name
       ORDER BY (COALESCE(SUM(col.Total_Collection), 0) - COALESCE(SUM(b.Total_Budget), 0)) DESC`
    );

    const report = rows.map((r) => {
      const budget = Number(r.Total_Budget || 0);
      const collection = Number(r.Total_Collection || 0);
      const profitLoss = Number((collection - budget).toFixed(2));
      const roi = budget > 0 ? Number(((profitLoss / budget) * 100).toFixed(2)) : null;
      return {
        Genre_ID: r.Genre_ID,
        Genre_Name: r.Genre_Name,
        Movie_Count: Number(r.Movie_Count || 0),
        Total_Budget: budget,
        Total_Collection: collection,
        Profit_Loss: profitLoss,
        ROI: roi,
        Status: getStatus(roi),
        Avg_Rating: Number(Number(r.Avg_Rating || 0).toFixed(1)),
      };
    });

    if (req.query.format === 'csv') {
      const csv = toCsv(
        ['Genre ID', 'Genre', 'Movies', 'Total Budget', 'Total Collection', 'Profit / Loss', 'ROI (%)', 'Status', 'Avg Rating'],
        report,
        ['Genre_ID', 'Genre_Name', 'Movie_Count', 'Total_Budget', 'Total_Collection', 'Profit_Loss', 'ROI', 'Status', 'Avg_Rating']
      );
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="genre-profitability-report.csv"');
      res.send(csv);
      return;
    }

    res.json({ report });
  })
);

router.get(
  '/directors',
  asyncHandler(async (req, res) => {
    const [rows] = await db.execute<any[]>(
      `SELECT d.Director_ID, d.Name AS Director_Name,
              COUNT(DISTINCT m.Movie_ID) AS Movie_Count,
              COALESCE(SUM(b.Total_Budget), 0) AS Total_Budget,
              COALESCE(SUM(col.Total_Collection), 0) AS Total_Collection,
              COALESCE(AVG(rev.Avg_Rating), 0) AS Avg_Rating
       FROM Director d
       LEFT JOIN Movie m ON d.Director_ID = m.Director_ID
       LEFT JOIN Budget b ON m.Movie_ID = b.Movie_ID
       LEFT JOIN (
         SELECT Movie_ID, SUM(Total_Collection) AS Total_Collection
         FROM Collection
         GROUP BY Movie_ID
       ) col ON m.Movie_ID = col.Movie_ID
       LEFT JOIN (
         SELECT Movie_ID, AVG(Rating) AS Avg_Rating
         FROM Review
         GROUP BY Movie_ID
       ) rev ON m.Movie_ID = rev.Movie_ID
       GROUP BY d.Director_ID, d.Name
       ORDER BY (COALESCE(SUM(col.Total_Collection), 0) - COALESCE(SUM(b.Total_Budget), 0)) DESC`
    );

    const report = rows.map((r) => {
      const budget = Number(r.Total_Budget || 0);
      const collection = Number(r.Total_Collection || 0);
      const profitLoss = Number((collection - budget).toFixed(2));
      const roi = budget > 0 ? Number(((profitLoss / budget) * 100).toFixed(2)) : null;
      return {
        Director_ID: r.Director_ID,
        Director_Name: r.Director_Name,
        Movie_Count: Number(r.Movie_Count || 0),
        Total_Budget: budget,
        Total_Collection: collection,
        Profit_Loss: profitLoss,
        ROI: roi,
        Status: getStatus(roi),
        Avg_Rating: Number(Number(r.Avg_Rating || 0).toFixed(1)),
      };
    });

    if (req.query.format === 'csv') {
      const csv = toCsv(
        ['Director ID', 'Director', 'Movies', 'Total Budget', 'Total Collection', 'Profit / Loss', 'ROI (%)', 'Status', 'Avg Rating'],
        report,
        ['Director_ID', 'Director_Name', 'Movie_Count', 'Total_Budget', 'Total_Collection', 'Profit_Loss', 'ROI', 'Status', 'Avg_Rating']
      );
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="director-profitability-report.csv"');
      res.send(csv);
      return;
    }

    res.json({ report });
  })
);

export default router;
