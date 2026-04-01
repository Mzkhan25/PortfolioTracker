export interface ApiResponse<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
  statusCode: number;
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

export interface PaginatedRequest {
  page?: number;
  limit?: number;
  sort?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
