export interface JwtPayload {
  sub: string;
  email: string;
  role?: string;
  iat?: number;
  exp?: number;
}

/**
 * Shape of request.user as returned by JwtStrategy.validate().
 * This is the decoded & reshaped object attached to the request,
 * where `sub` maps to `userId` from the JWT payload.
 */
export interface RequestUser {
  userId: string;
  email: string;
  role: string;
}
