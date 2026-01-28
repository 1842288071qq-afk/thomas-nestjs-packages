import { JwtPayload } from './jwt-payload.type';

export interface JwtIssueResult {
  token: string;
  payload: JwtPayload;
}
