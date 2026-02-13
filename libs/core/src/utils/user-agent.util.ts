export class UserAgentUtil {
  /**
   * 判断是否为移动设备
   * @warning User-Agent header 易被伪造，不可用于安全验证，仅供统计或体验优化参考
   * @param userAgent User-Agent 字符串
   * @returns boolean
   */
  static isMobile(userAgent: string): boolean {
    if (!userAgent) {
      return false;
    }

    const mobileRegex =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i;
    return mobileRegex.test(userAgent);
  }

  /**
   * 获取设备类型
   * @param userAgent User-Agent 字符串
   * @returns 'Mobile' | 'PC'
   */
  static getDeviceType(userAgent: string): 'Mobile' | 'PC' {
    return this.isMobile(userAgent) ? 'Mobile' : 'PC';
  }

  /**
   * 获取详细的操作系统信息（简易版）
   * @param userAgent User-Agent 字符串
   * @returns string (e.g. 'iOS', 'Android', 'Windows', 'Mac', 'Linux', 'Unknown')
   */
  static getOS(userAgent: string): string {
    if (!userAgent) return 'Unknown';

    if (/iPad|iPhone|iPod/.test(userAgent)) {
      return 'iOS';
    }
    if (/Android/.test(userAgent)) {
      return 'Android';
    }
    if (/Windows/.test(userAgent)) {
      return 'Windows';
    }
    if (/Macintosh|Mac OS X/.test(userAgent)) {
      return 'Mac';
    }
    if (/Linux/.test(userAgent)) {
      return 'Linux';
    }

    return 'Unknown';
  }
}
