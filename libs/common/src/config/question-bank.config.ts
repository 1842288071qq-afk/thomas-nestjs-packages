import { registerAs } from '@nestjs/config';

export default registerAs('questionBank', () => ({
  baseUrl:
    process.env.QUESTION_BANK_BASE_URL ||
    'https://dev-content-center.ksbao.com',
  defaultAgentId: process.env.QUESTION_BANK_DEFAULT_AGENT_ID || '888',
  sessionKey: process.env.QUESTION_BANK_DEFAULT_SESSION_KEY || '',
}));
