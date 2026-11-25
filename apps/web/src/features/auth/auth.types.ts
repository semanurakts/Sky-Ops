export type AuthRole = "ADMIN" | "STAFF" | "PASSENGER";

export interface AuthUser {
  id: string;
  email: string;
  role: AuthRole;
  personnelId: string | null;
  isActive?: boolean;
}

export interface AuthSessionResponse {
  user: AuthUser;
  expiresAt: string;
}