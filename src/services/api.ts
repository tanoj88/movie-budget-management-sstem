import type {
  AuthUser,
  Budget,
  CastMember,
  CollectionEntry,
  DashboardData,
  Director,
  DirectorProfitabilityRow,
  Genre,
  GenreProfitabilityRow,
  Movie,
  MovieDetailResponse,
  MovieProfitabilityRow,
  MovieRole,
  Review,
  UserRecord,
  UserRole,
} from '../types';

const TOKEN_STORAGE_KEY = 'mbms_jwt_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(path, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorMessage = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) errorMessage = data.error;
    } catch {
      // ignore json parse failure
    }
    throw new Error(errorMessage);
  }

  return res.json() as Promise<T>;
}

export const authApi = {
  login: (email: string, password: string) =>
    request<{ token: string; user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (name: string, email: string, password: string) =>
    request<{ token: string; user: AuthUser }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),
  me: () => request<{ user: AuthUser }>('/api/auth/me'),
  getUsers: () => request<{ users: UserRecord[] }>('/api/auth/users'),
  updateUserRole: (id: number, role: UserRole) =>
    request<{ message: string }>(`/api/auth/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    }),
  deleteUser: (id: number) =>
    request<{ message: string }>(`/api/auth/users/${id}`, {
      method: 'DELETE',
    }),
};

export const moviesApi = {
  list: (params: Record<string, string | number | undefined>) => {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') sp.set(k, String(v));
    });
    return request<{
      movies: Movie[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
      filters: { languages: string[]; years: string[] };
    }>(`/api/movies?${sp.toString()}`);
  },
  listAllCompact: () =>
    request<{ movies: Array<{ Movie_ID: number; Title: string; Release_Date: string; Genre_Name: string }> }>(
      '/api/movies/all'
    ),
  getDetail: (id: number) => request<MovieDetailResponse>(`/api/movies/${id}`),
  create: (payload: Partial<Movie>) =>
    request<{ movie: Movie }>('/api/movies', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: number, payload: Partial<Movie>) =>
    request<{ movie: Movie }>(`/api/movies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  remove: (id: number) =>
    request<{ message: string }>(`/api/movies/${id}`, {
      method: 'DELETE',
    }),
};

export const genresApi = {
  list: () => request<{ genres: Genre[] }>('/api/genres'),
  create: (Genre_Name: string) =>
    request<{ genre: Genre }>('/api/genres', {
      method: 'POST',
      body: JSON.stringify({ Genre_Name }),
    }),
  update: (id: number, Genre_Name: string) =>
    request<{ genre: Genre }>(`/api/genres/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ Genre_Name }),
    }),
  remove: (id: number) =>
    request<{ message: string }>(`/api/genres/${id}`, {
      method: 'DELETE',
    }),
};

export const directorsApi = {
  list: (q = '') =>
    request<{ directors: Director[] }>(`/api/directors${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  create: (payload: Partial<Director>) =>
    request<{ director: Director }>('/api/directors', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: number, payload: Partial<Director>) =>
    request<{ director: Director }>(`/api/directors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  remove: (id: number) =>
    request<{ message: string }>(`/api/directors/${id}`, {
      method: 'DELETE',
    }),
};

export const castApi = {
  list: (q = '') =>
    request<{ cast: CastMember[] }>(`/api/cast${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  create: (payload: Partial<CastMember>) =>
    request<{ castMember: CastMember }>('/api/cast', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: number, payload: Partial<CastMember>) =>
    request<{ castMember: CastMember }>(`/api/cast/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  remove: (id: number) =>
    request<{ message: string }>(`/api/cast/${id}`, {
      method: 'DELETE',
    }),
};

export const rolesApi = {
  list: (movieId?: number) =>
    request<{ roles: MovieRole[] }>(`/api/roles${movieId ? `?movieId=${movieId}` : ''}`),
  create: (payload: { Movie_ID: number; Cast_ID: number; Role_Name: string }) =>
    request<{ role: MovieRole }>('/api/roles', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  remove: (id: number) =>
    request<{ message: string }>(`/api/roles/${id}`, {
      method: 'DELETE',
    }),
};

export const budgetsApi = {
  list: () =>
    request<{
      budgets: Budget[];
      totals: { production: number; marketing: number; totalBudget: number; totalCollection: number };
    }>('/api/budgets'),
  create: (payload: { Movie_ID: number; Production_Cost: number; Marketing_Cost: number }) =>
    request<{ budget: Budget }>('/api/budgets', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: number, payload: { Production_Cost: number; Marketing_Cost: number }) =>
    request<{ budget: Budget }>(`/api/budgets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  remove: (id: number) =>
    request<{ message: string }>(`/api/budgets/${id}`, {
      method: 'DELETE',
    }),
};

export const collectionsApi = {
  list: (movieId?: number) =>
    request<{ collections: CollectionEntry[] }>(
      `/api/collections${movieId ? `?movieId=${movieId}` : ''}`
    ),
  create: (payload: {
    Movie_ID: number;
    Week_Number: number;
    Domestic_Collection: number;
    Overseas_Collection: number;
  }) =>
    request<{ collection: CollectionEntry }>('/api/collections', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (
    id: number,
    payload: {
      Week_Number: number;
      Domestic_Collection: number;
      Overseas_Collection: number;
    }
  ) =>
    request<{ collection: CollectionEntry }>(`/api/collections/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  remove: (id: number) =>
    request<{ message: string }>(`/api/collections/${id}`, {
      method: 'DELETE',
    }),
};

export const reviewsApi = {
  list: (movieId?: number) =>
    request<{ reviews: Review[] }>(`/api/reviews${movieId ? `?movieId=${movieId}` : ''}`),
  create: (payload: { Movie_ID: number; Rating: number; Review_Text: string }) =>
    request<{ review: Review }>('/api/reviews', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: number, payload: { Rating: number; Review_Text: string }) =>
    request<{ review: Review }>(`/api/reviews/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  remove: (id: number) =>
    request<{ message: string }>(`/api/reviews/${id}`, {
      method: 'DELETE',
    }),
};

export const reportsApi = {
  dashboard: (movieId?: number | null) =>
    request<DashboardData>(
      `/api/reports/dashboard${movieId ? `?movieId=${movieId}` : ''}`
    ),
  profitability: () =>
    request<{ report: MovieProfitabilityRow[] }>('/api/reports/profitability'),
  genres: () =>
    request<{ report: GenreProfitabilityRow[] }>('/api/reports/genres'),
  directors: () =>
    request<{ report: DirectorProfitabilityRow[] }>('/api/reports/directors'),
};
