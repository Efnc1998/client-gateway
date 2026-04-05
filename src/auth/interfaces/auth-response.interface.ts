export interface UserResponse {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  user: UserResponse;
  token: string;
}
