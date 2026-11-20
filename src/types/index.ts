export type UserRole = 'Admin' | 'User';

export interface AuthUser {
  userId: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface UserRecord {
  User_ID: number;
  Name: string;
  Email: string;
  Role: UserRole;
  Review_Count: number;
}

export interface Genre {
  Genre_ID: number;
  Genre_Name: string;
  Movie_Count?: number;
}

export interface Director {
  Director_ID: number;
  Name: string;
  Gender: string | null;
  Date_of_Birth: string | null;
  Bio: string | null;
  Photo_URL: string | null;
  Movie_Count?: number;
}

export interface CastMember {
  Cast_ID: number;
  Name: string;
  Gender: string | null;
  Date_of_Birth: string | null;
  Bio: string | null;
  Photo_URL: string | null;
  Role_Count?: number;
}

export interface MovieRole {
  Role_ID: number;
  Movie_ID: number;
  Cast_ID: number;
  Role_Name: string;
  Movie_Title?: string;
  Cast_Name: string;
  Gender?: string | null;
  Cast_Photo_URL?: string | null;
}

export interface Movie {
  Movie_ID: number;
  Title: string;
  Genre_ID: number | null;
  Director_ID: number | null;
  Language: string | null;
  Release_Date: string | null;
  Duration: number | null;
  Description: string | null;
  Poster_URL: string | null;
  Genre_Name?: string | null;
  Director_Name?: string | null;
  Director_Photo_URL?: string | null;
  Director_Bio?: string | null;
  Production_Cost?: number;
  Marketing_Cost?: number;
  Total_Budget?: number;
  Total_Collection?: number;
  Avg_Rating?: number;
  Review_Count?: number;
}

export interface Budget {
  Budget_ID: number;
  Movie_ID: number;
  Production_Cost: number;
  Marketing_Cost: number;
  Total_Budget: number;
  Movie_Title?: string;
  Release_Date?: string | null;
  Genre_Name?: string | null;
  Total_Collection?: number;
  Variance?: number;
  Collection_Status?: 'Exceeds Budget' | 'Below Budget' | 'Break-Even' | 'No Collections';
}

export interface CollectionEntry {
  Collection_ID: number;
  Movie_ID: number;
  Week_Number: number;
  Domestic_Collection: number;
  Overseas_Collection: number;
  Total_Collection: number;
  Movie_Title?: string;
  Total_Budget?: number;
  Cumulative_Collection: number;
  Break_Even_Reached: boolean;
  Break_Even_Percent?: number | null;
}

export interface Review {
  Review_ID: number;
  Movie_ID: number;
  User_ID: number;
  Rating: number;
  Review_Text: string;
  Review_Date: string;
  User_Name: string;
  User_Role: UserRole;
  Movie_Title?: string;
}

export type ProfitabilityStatus = 'Hit' | 'Average' | 'Flop' | 'Unbudgeted';

export interface MovieDetailResponse {
  movie: Movie;
  cast: MovieRole[];
  budget: Budget | null;
  collections: CollectionEntry[];
  financials: {
    totalBudget: number;
    totalCollection: number;
    profitLoss: number;
    roi: number | null;
    status: ProfitabilityStatus;
    breakEvenReached: boolean;
  };
  reviews: Review[];
  ratingSummary: {
    average: number;
    count: number;
  };
}

export interface DashboardData {
  summary: {
    totalMovies: number;
    totalBudget: number;
    totalCollection: number;
    totalProfitLoss: number;
    avgRating: number;
    totalReviews: number;
  };
  budgetVsCollection: Array<{
    Movie_ID: number;
    Title: string;
    Total_Budget: number;
    Total_Collection: number;
  }>;
  genreCollections: Array<{
    Genre_ID: number;
    Genre_Name: string;
    Total_Collection: number;
  }>;
  topProfitable: Array<{
    Movie_ID: number;
    Title: string;
    Genre_Name: string | null;
    Total_Budget: number;
    Total_Collection: number;
    Profit_Loss: number;
    ROI: number | null;
    Status: ProfitabilityStatus;
  }>;
  weeklyTrend: Array<{
    Week: string;
    Week_Number: number;
    Domestic: number;
    Overseas: number;
    Total: number;
    Cumulative: number;
  }>;
  trendMovieId: number | null;
  movieOptions: Array<{
    Movie_ID: number;
    Title: string;
  }>;
}

export interface MovieProfitabilityRow {
  Movie_ID: number;
  Title: string;
  Genre_Name: string;
  Director_Name: string;
  Language: string;
  Release_Date: string;
  Production_Cost: number;
  Marketing_Cost: number;
  Total_Budget: number;
  Total_Collection: number;
  Profit_Loss: number;
  ROI: number | null;
  Status: ProfitabilityStatus;
  Avg_Rating: number;
}

export interface GenreProfitabilityRow {
  Genre_ID: number;
  Genre_Name: string;
  Movie_Count: number;
  Total_Budget: number;
  Total_Collection: number;
  Profit_Loss: number;
  ROI: number | null;
  Status: ProfitabilityStatus;
  Avg_Rating: number;
}

export interface DirectorProfitabilityRow {
  Director_ID: number;
  Director_Name: string;
  Movie_Count: number;
  Total_Budget: number;
  Total_Collection: number;
  Profit_Loss: number;
  ROI: number | null;
  Status: ProfitabilityStatus;
  Avg_Rating: number;
}
