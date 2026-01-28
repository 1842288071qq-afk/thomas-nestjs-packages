import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

export interface PasswordUtilOptions {
  saltLength?: number; // 盐的长度
  saltPosition?: 'prefix' | 'suffix'; // 盐的位置
}

@Injectable()
export class PasswordUtil {
  private saltLength: number;
  private saltPosition: 'prefix' | 'suffix';

  constructor() {
    this.saltLength = 12;
    this.saltPosition = 'suffix';
  }

  /**
   * 生成随机盐
   */
  generateSalt(): string {
    return crypto
      .randomBytes(this.saltLength)
      .toString('hex')
      .slice(0, this.saltLength);
  }

  /**
   * 加密密码，返回格式: salt$hash
   */
  hashPassword(
    password: string,
    salt?: string,
  ): { salt: string; hash: string } {
    const realSalt = salt || this.generateSalt();
    let toHash: string;
    if (this.saltPosition === 'prefix') {
      toHash = realSalt + password;
    } else {
      toHash = password + realSalt;
    }
    const hash = crypto.createHash('md5').update(toHash).digest('hex');
    return { salt: realSalt, hash };
  }

  /**
   * 校验密码（salt和hash分开存储）
   */
  verifyPassword(password: string, hash: string, salt: string): boolean {
    if (!salt || !hash) return false;
    const verifyHash = this.hashPassword(password, salt).hash;
    return hash === verifyHash;
  }
}
