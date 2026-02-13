export interface SessionData {
  jti: string;
  accountId: string;
  client?: string;
  system: string;
  createdAt: number;
  lastActivityAt: number;
  kickedOut?: boolean;
}
