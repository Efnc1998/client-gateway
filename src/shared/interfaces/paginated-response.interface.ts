export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    totalItems: number;
    currentPage: number;
    lastPage: number;
  };
}
