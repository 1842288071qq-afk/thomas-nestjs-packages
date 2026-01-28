export interface JwtIssueInput {
  accountId: string;
  identityIds: string[];
  client: string;
  system: string;

  /** 过期时间（秒） */
  expiresIn?: number;
}
