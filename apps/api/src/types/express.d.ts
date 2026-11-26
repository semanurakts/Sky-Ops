
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: "ADMIN" | "STAFF" | "PASSENGER";
  isActive: boolean;
  personnelId: string | null;
}

export interface AuthContext {
  sessionId: string;
  expiresAt: Date;
  user: AuthenticatedUser;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export {};
