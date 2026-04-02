/**
 * 字典数据项
 */
export interface DictItem {
  /**
   * 字典值 (代码/ID)，要求在 dictKey 下全局唯一
   */
  value: string;
  /**
   * 显示文本
   */
  text: string;
  /**
   * 子项目 (树形结构)
   */
  children?: DictItem[];
  /**
   * 扩展属性（推荐统一放入 ext 中）
   */
  ext?: Record<string, any>;
  /**
   * 扩展属性 (可选)
   */
  [key: string]: any;
}

/**
 * 字典组 (对应 JSON 中的一级对象)
 */
export interface DictGroup {
  /**
   * 字典标识符 (如 hospital_level)
   */
  key: string;
  /**
   * 字典名称 (描述)
   */
  name: string;
  /**
   * 字典项列表
   */
  items: DictItem[];
}

/**
 * 带有路径信息的翻译结果
 */
export interface DictTranslateResult {
  value: string;
  text: string;
  /**
   * 文本路径 (例如: ["三级医院", "三级甲等"])
   */
  textPath: string[];
  /**
   * 代码路径 (例如: ["sj", "sjjd"])
   */
  codePath: string[];
  /**
   * 原始项的扩展属性
   */
  ext?: Record<string, any>;
}
