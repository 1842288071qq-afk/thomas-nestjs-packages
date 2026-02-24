/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  TestJson,
  TestType,
  TestOption,
  TestJsonBase,
} from '@thomas/nestjs/entities/questionBank/DTO/testJson';

/**
 * 将题库中心原始题目项转换为 CenterTestItem 实体所需的平铺属性和 TestJson
 *
 * @param sourceItem 题库中心原始 TestItem 对象
 * @param appId 原始 appId (用于生成 semanticId)
 * @param subjectId 本地系统科目 ID
 * @returns 包含平铺字段和 testJson 的字面量对象
 */
export function transformCenterTestItem(
  sourceItem: any,
  appId: string,
  eName: string,
) {
  const testJson = convertToTestJson(sourceItem);

  // 确定子题目数量
  let blankCount = 1;
  if (testJson.subTests && testJson.subTests.length > 0) {
    blankCount = testJson.subTests.length;
  } else if (testJson.blankCount) {
    blankCount = testJson.blankCount;
  }

  const styleType = sourceItem.StyleType;

  // 特殊的，B题型的title要试用testJson中的subTests下的title用逗号组合
  let title = sourceItem.FrontTitle || sourceItem.Title || '';
  if (styleType === TestType.BTEST) {
    title = testJson.subTests?.map((sub) => sub.title).join(',') || '';
  }

  return {
    // 科目id
    subjectId: appId,
    // 科目下id
    allTestId: sourceItem.AllTestID?.toString(),
    // 全局语义id
    semanticId: `${eName}_${sourceItem.AllTestID}`,
    // 优先A3题型的FrontTitle
    title,
    blankCount,
    testJson,
    originJson: sourceItem,
    styleType,
  };
}

/**
 * 将题库中心原始题目项转换为统一的 TestJson 格式
 */
export function convertToTestJson(sourceItem: any): TestJson {
  const type = (sourceItem.StyleType as TestType) || TestType.ATEST;

  // 这里B和A3题型的allTestID会是不同的
  const allTestId =
    sourceItem.AllTestID || sourceItem.BTestItemID || sourceItem.A3TestItemID;
  const result: TestJson = {
    allTestId: allTestId?.toString() || '',
    title: sourceItem.FrontTitle || sourceItem.Title || '',
    type,
    difficulty: sourceItem.Difficulty ? parseInt(sourceItem.Difficulty) : 5, // 默认难度 5
    score: sourceItem.Score || 1,
    keyPoints: sourceItem.TestPoint || '',
    explain: sourceItem.Explain || '',
    answer: formatAnswer(sourceItem.Answer),
    options: formatOptions(sourceItem.SelectedItems),
  };

  // 处理复合题型 (A3, B, TK 等)
  if (type === TestType.A3TEST && sourceItem.A3TestItems) {
    result.subTests = sourceItem.A3TestItems.map((sub: any) => {
      const subTest = convertToSubTestJson(sub);
      return subTest;
    });
  }

  if (type === TestType.BTEST && sourceItem.BTestItems) {
    // const sharedOptions = result.options;
    result.subTests = sourceItem.BTestItems.map((sub: any) => {
      const subTest = convertToSubTestJson(sub);
      // // BTEST 必须共用父题选项
      // if ((!subTest.options || subTest.options.length === 0) && sharedOptions) {
      //   subTest.options = sharedOptions;
      // }
      // B题型小题选项用大题内的数据
      return subTest;
    });
    // B题型的title设置为空，因为共用选项，title是分开的
    result.title = '';
  }

  // 填空题会在json中直接确定blankCount
  if (type === TestType.TKTEST) {
    const answers = formatAnswer(sourceItem.Answer);
    result.blankCount = answers.length || 1;
    // 默认填空题每空1分
    result.score = result.blankCount;
  }

  // 修正 A3/B 题型外层冗余字段及分值累加
  if (type === TestType.A3TEST || type === TestType.BTEST) {
    result.answer = [];
    result.explain = '';
    // A3题型小题选项不需要
    if (type === TestType.A3TEST) {
      result.options = undefined;
    }

    if (result.subTests && result.subTests.length > 0) {
      // 累加所有小题分数作为总分
      result.score = result.subTests.reduce(
        (sum, sub) => sum + (sub.score || 0),
        0,
      );
    }
  }

  return result;
}

/**
 * 转换子题目
 */
function convertToSubTestJson(sub: any): TestJsonBase {
  const allTestId = sub.AllTestID || sub.BTestItemID || sub.A3TestItemID;
  return {
    allTestId: allTestId?.toString() || '',
    title: sub.Title || '',
    type: (sub.StyleType as TestType) || TestType.ATEST, // 通常继承或指定
    difficulty: sub.Difficulty ? parseInt(sub.Difficulty) : 5,
    score: sub.Score || 1,
    keyPoints: sub.TestPoint || '',
    explain: sub.Explain || '',
    answer: formatAnswer(sub.Answer),
    options: formatOptions(sub.SelectedItems),
  };
}

/**
 * 统一答案格式为字符串数组
 */
function formatAnswer(answer: any): string[] {
  if (Array.isArray(answer)) {
    return answer.map((a) => a?.toString() || '');
  }
  if (typeof answer === 'string') {
    if (answer.includes(',')) {
      return answer.split(',').map((s) => s.trim());
    }
    return [answer];
  }
  if (answer === null || answer === undefined) {
    return [];
  }
  return [answer.toString()];
}

/**
 * 统一选项格式
 */
function formatOptions(selectedItems: any[]): TestOption[] | undefined {
  if (!Array.isArray(selectedItems) || selectedItems.length === 0) {
    return undefined;
  }
  return selectedItems.map((item) => ({
    name: item.ItemName || '',
    content: item.Content || '',
  }));
}
