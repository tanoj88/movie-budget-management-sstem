# Movie Budget Management System

A full-stack studio production budget, weekly box-office collection, profitability analytics, and film catalog management system built with **React (Vite + Tailwind CSS)**, **Node.js + Express**, and **MySQL (`mysql2`)**.

## Folder Structure

```text
├── .env.example              # MySQL, JWT, and server port environment template
├── index.html                # Vite HTML entry point & Google Fonts
├── package.json              # Scripts & dependencies
├── schema.sql                # MySQL database & 9-table DDL (movie_management_database)
├── seed.sql                  # Realistic sample data (8 genres, 6 directors, 15 cast, 10 movies, budgets, collections, 3 users, reviews)
├── server.ts                 # Express + Vite unified server entry point (port 3000)
├── server/
│   ├── config/
│   │   └── db.ts             # mysql2 connection pool (+ automatic embedded fallback when MySQL is unavailable)
│   ├── middleware/
│   │   ├── auth.ts           # JWT verification & Admin role authorization
│   │   └── errorHandler.ts   # Centralized Express error & FK constraint handler
│   └── routes/
│       ├── auth.ts           # /api/auth (register, login, me, admin user management)
│       ├── budgets.ts        # /api/budgets (1 per movie, auto Total_Budget calculation)
│       ├── cast.ts           # /api/cast (CRUD + reference protection)
│       ├── collections.ts    # /api/collections (weekly tracking, duplicate week check, break-even)
│       ├── directors.ts      # /api/directors (CRUD + reference protection)
│       ├── genres.ts         # /api/genres (CRUD + reference protection)
│       ├── movies.ts         # /api/movies (search, filters, sort, pagination, full dossier)
│       ├── reports.ts        # /api/reports (dashboard KPIs, charts, profitability + CSV export)
│       ├── reviews.ts        # /api/reviews (0.0-5.0 ratings, 1 per user per movie, ownership rules)
│       └── roles.ts          # /api/roles (Movie_Role cast assignments)
└── src/                      # React (Vite) Frontend
    ├── App.tsx               # Sidebar layout, theme toggle, navigation shell
    ├── index.css             # Tailwind CSS v4 + dark mode custom variant + typography
    ├── main.tsx              # React DOM mount
    ├── types/index.ts        # Shared TypeScript interfaces
    ├── utils/format.ts       # Currency, ROI, date, and initials formatters
    ├── services/api.ts       # Typed API client with JWT Bearer injection
    ├── context/
    │   ├── AuthContext.tsx   # JWT session state
    │   └── ToastContext.tsx  # Toast notifications
    ├── components/
    │   ├── auth/AuthModal.tsx
    │   └── ui/               # PosterImage, AvatarImage, StatusBadge, Modal, ConfirmDialog, Pagination, Skeleton
    └── pages/
        ├── DashboardPage.tsx
        ├── MoviesPage.tsx
        ├── MovieDetailPage.tsx
        ├── BudgetsPage.tsx
        ├── CollectionsPage.tsx
        ├── ReportsPage.tsx
        ├── CatalogEntitiesPage.tsx
        └── UsersPage.tsx
```

## Setup & Installation

### 1. Install Dependencies
```bash
npm install
```

### 2. Create MySQL Database & Seed Data
Ensure MySQL 8+ is running locally, then run:
```bash
mysql -u root -p < schema.sql
mysql -u root -p < seed.sql
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your MySQL credentials:
```bash
cp .env.example .env
```
Update `.env`:
```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=movie_management_database
JWT_SECRET=replace_with_a_strong_random_secret
PORT=3000
```

### 4. Start the Application
Development mode (Express API + Vite frontend served together on port `3000`):
```bash
npm run dev
```

Production build & start:
```bash
npm run build
npm start
```

Open `http://localhost:3000` in your browser.

## Default Accounts (from `seed.sql`)

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@studiopulse.com` | `Admin@123` | Full CRUD on movies, budgets, collections, cast, directors, genres, roles, reviews, and user accounts |
| **User** | `producer@studiopulse.com` | `User@123` | Browse movies, view budgets/collections/reports, add/edit/delete own reviews |
| **User** | `analyst@studiopulse.com` | `User@123` | Browse movies, view budgets/collections/reports, add/edit/delete own reviews |
