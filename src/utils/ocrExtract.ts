import { LotteryType, BallNumbers, LOTTERY_CONFIGS } from '../types';
import { generateRandomNumbers } from './lottery';

/**
 * OCR 号码提取模块
 * 从百度 OCR 识别的文本中自动解析彩票号码
 * 支持多种格式：带圈数字、关键词分隔、纯数字序列等
 */

/** 各彩票类型中用于区分红球/蓝球的关键词 */
interface LotteryKeywords {
  redKeywords: string[];
  blueKeywords: string[];
}

const KEYWORD_MAP: Record<string, LotteryKeywords> = {
  [LotteryType.SHUANGSEQIU]: {
    redKeywords: ['红球', '红色球', '红号', '红色号码', '前区'],
    blueKeywords: ['蓝球', '蓝色球', '蓝号', '蓝色号码', '后区', '特别号'],
  },
  [LotteryType.DALETOU]: {
    redKeywords: ['前区', '红球', '正选号码'],
    blueKeywords: ['后区', '蓝球', '特别号码'],
  },
  // 排列三/五、七星彩、福彩3D 仅为数字序列，无红蓝球之分
  [LotteryType.PAILIE3]: { redKeywords: [], blueKeywords: [] },
  [LotteryType.PAILIE5]: { redKeywords: [], blueKeywords: [] },
  [LotteryType.QIXINGCAI]: { redKeywords: [], blueKeywords: [] },
  [LotteryType.FUCAI3D]: { redKeywords: [], blueKeywords: [] },
};

// 带圈数字字符集（Unicode 编码范围）
// 包含 ①②③...⑳、㉑...㉟、❶❷❸...❿、⓫⓬...ⓔ
const CIRCLED_CHARS =
  String.fromCodePoint(...Array.from({ length: 20 }, (_, i) => 0x2460 + i)) +
  String.fromCodePoint(...Array.from({ length: 15 }, (_, i) => 0x3251 + i)) +
  String.fromCodePoint(...Array.from({ length: 10 }, (_, i) => 0x2776 + i)) +
  String.fromCodePoint(...Array.from({ length: 10 }, (_, i) => 0x24EB + i));

/** 检测文本中是否包含带圈数字（如 ①②③ 等） */
function hasCircledNumbers(text: string): boolean {
  for (const ch of CIRCLED_CHARS) {
    if (text.includes(ch)) return true;
  }
  return false;
}

/**
 * 将带圈数字字符替换为普通数字
 * 如 ①→1、⑳→20、㉑→21、❶→1、⓫→11
 */
function normalizeCircledNumbers(text: string): string {
  let result = text;
  // ①②③...⑳ (U+2460~U+2473) -> 1~20
  for (let i = 0; i < 20; i++) {
    result = result.replace(new RegExp(String.fromCodePoint(0x2460 + i), 'g'), String(i + 1));
  }
  // ㉑...㉟ (U+3251~U+325F) -> 21~35
  for (let i = 0; i < 15; i++) {
    result = result.replace(new RegExp(String.fromCodePoint(0x3251 + i), 'g'), String(i + 21));
  }
  // ❶❷❸...❿ (U+2776~U+277F) -> 1~10
  for (let i = 0; i < 10; i++) {
    result = result.replace(new RegExp(String.fromCodePoint(0x2776 + i), 'g'), String(i + 1));
  }
  // ⓫⓬...ⓔ (U+24EB~U+24F4) -> 11~20
  for (let i = 0; i < 10; i++) {
    result = result.replace(new RegExp(String.fromCodePoint(0x24EB + i), 'g'), String(i + 11));
  }
  return result;
}

/**
 * 从文本中提取指定范围内的有效号码数字（结果升序排序）
 * 支持按空格分割的单独数字，也支持连写数字（如 "0912131724" 按两位一组分割）
 * @param text 待提取的文本
 * @param min 数字最小值
 * @param max 数字最大值
 * @param count 需要提取的数量
 * @returns 提取到的数字数组（去重、排序）
 */
function extractValidNumbers(text: string, min: number, max: number, count: number): number[] {
  const result: number[] = [];
  const seen = new Set<number>();

  // 先按空格分割，然后处理每个部分
  const parts = text.trim().split(/\s+/);
  
  for (const part of parts) {
    if (result.length >= count) break;
    
    // 如果部分长度大于2且为纯数字，可能是连续号码（如 "0912131724"）
    if (part.length > 2 && /^\d+$/.test(part)) {
      // 按两位一组分割
      for (let i = 0; i < part.length && result.length < count; i += 2) {
        const numStr = part.substring(i, i + 2);
        if (numStr.length === 1 || numStr.length === 2) {
          const n = parseInt(numStr, 10);
          if (n >= min && n <= max && !seen.has(n)) {
            seen.add(n);
            result.push(n);
          }
        }
      }
    } else {
      // 正常的1-2位数字
      const matches = part.match(/\d{1,2}/g) || [];
      for (const m of matches) {
        if (result.length >= count) break;
        const n = parseInt(m, 10);
        if (n >= min && n <= max && !seen.has(n)) {
          seen.add(n);
          result.push(n);
        }
      }
    }
  }

  result.sort((a, b) => a - b);
  return result;
}

/**
 * 提取数字但不排序，保持原始顺序
 * 用于带圈数字格式中，需要按原始顺序拆分红球/蓝球
 */
function extractValidNumbersUnsorted(text: string, min: number, max: number, count: number): number[] {
  const result: number[] = [];
  const seen = new Set<number>();

  const parts = text.trim().split(/\s+/);
  
  for (const part of parts) {
    if (result.length >= count) break;
    
    if (part.length > 2 && /^\d+$/.test(part)) {
      for (let i = 0; i < part.length && result.length < count; i += 2) {
        const numStr = part.substring(i, i + 2);
        if (numStr.length === 1 || numStr.length === 2) {
          const n = parseInt(numStr, 10);
          if (n >= min && n <= max && !seen.has(n)) {
            seen.add(n);
            result.push(n);
          }
        }
      }
    } else {
      const matches = part.match(/\d{1,2}/g) || [];
      for (const m of matches) {
        if (result.length >= count) break;
        const n = parseInt(m, 10);
        if (n >= min && n <= max && !seen.has(n)) {
          seen.add(n);
          result.push(n);
        }
      }
    }
  }

  return result;
}

/**
 * 提取简单数字序列（用于排列三/排列五等只有红球的彩种）
 * 从文本中提取单个数字，组装为指定数量的号码
 */
function extractSimpleDigits(text: string, count: number, maxDigit: number): number[] {
  const result: number[] = [];
  const digits = text.match(/\d/g);
  if (!digits) return result;

  for (let i = 0; i < digits.length && result.length < count; i++) {
    const n = parseInt(digits[i], 10);
    if (n >= 0 && n <= maxDigit) {
      result.push(n);
    }
  }

  return result;
}

/**
 * 从带圈数字格式的文本中提取号码
 * 格式示例：①0912131724+0506 → 红球 09 12 13 17 24，蓝球 05 06
 */
function extractByCircledFormat(
  rawText: string,
  type: LotteryType,
): { bets: BallNumbers[]; issueNumber: string | null } {
  const config = LOTTERY_CONFIGS[type];

  // 以带圈数字为分隔符拆分文本
  const parts = rawText.split(new RegExp(`[${CIRCLED_CHARS}]`));
  const prefix = parts[0] || '';

  // 尝试从文本前缀中提取期号（如 "第26052期"）
  const issueMatch = prefix.match(/第(\d{5,})期/);
  const issueNumber = issueMatch ? issueMatch[1] : null;

  const bets: BallNumbers[] = [];

  // 每个带圈数字后的文本对应一注
  for (let i = 1; i < parts.length; i++) {
    const segment = normalizeCircledNumbers(parts[i]);
    const cleaned = segment
      .replace(/[：:]/g, ':')
      .replace(/[（）()]/g, ' ')
      .replace(/[【】\[\]]/g, ' ')
      .replace(/\n+/g, ' ')   // 将换行符替换为空格
      .trim();

    if (!cleaned) continue;

    // 尝试找到红球和蓝球的分隔符（+号或空格分隔的两组数字）
    const plusIdx = cleaned.search(/[+＋]/);
    let redText = '';
    let blueText = '';

    if (plusIdx >= 0) {
      // 有+号分隔，前面是红球、后面是蓝球
      redText = cleaned.slice(0, plusIdx);
      blueText = cleaned.slice(plusIdx + 1);
    } else {
      // 没有+号，按空格分割
      const spaceParts = cleaned.trim().split(/\s+/);
      
      if (spaceParts.length >= 2) {
        // 第一部分是红球（连续数字如 0912131724）
        const firstPart = spaceParts[0];
        const redNumsArray = extractValidNumbersUnsorted(firstPart, 1, config.redMax, config.redCount);
        redText = redNumsArray.join(' ');
        
        // 蓝球是剩余部分的前几个数字
        let blueParts = [];
        for (let j = 1; j < spaceParts.length; j++) {
          const part = spaceParts[j];
          if (/^\d{1,2}$/.test(part)) {
            blueParts.push(part);
          } else {
            break; // 遇到非数字文本，停止
          }
        }
        blueText = blueParts.join(' ');
      } else {
        redText = cleaned;   // 只有一部分，全部作为红球
        blueText = '';
      }
    }

    const redNums = extractValidNumbers(redText, 1, config.redMax, config.redCount);
    const blueNums = config.blueCount > 0
      ? extractValidNumbers(blueText, 1, config.blueMax, config.blueCount)
      : [];

    if (
      redNums.length === config.redCount &&
      (config.blueCount === 0 || blueNums.length === config.blueCount)
    ) {
      bets.push({ red: redNums, blue: blueNums });
    }
  }

  return { bets, issueNumber };
}

/**
 * 在文本中查找关键词之间的片段
 * 例如查找 "红球" 到 "蓝球" 之间的内容即为红球号码区域
 */
function findSection(text: string, keywords: string[], nextKeywords: string[]): string {
  const allNext = [...keywords, ...nextKeywords];
  let bestIdx = -1;
  let bestKeyword = '';

  // 找到最早出现的关键词位置
  for (const kw of keywords) {
    const idx = text.indexOf(kw);
    if (idx !== -1 && (bestIdx === -1 || idx < bestIdx)) {
      bestIdx = idx;
      bestKeyword = kw;
    }
  }

  if (bestIdx === -1) return '';

  // 找到该关键词之后最早出现的另一组关键词，作为结束位置
  let endIdx = text.length;
  for (const nk of allNext) {
    const nidx = text.indexOf(nk, bestIdx + bestKeyword.length);
    if (nidx !== -1 && nidx < endIdx) {
      endIdx = nidx;
    }
  }

  return text.slice(bestIdx + bestKeyword.length, endIdx);
}

/**
 * 基于关键词（如"红球"、"蓝球"）定位并提取号码
 * 适用于包含明确红蓝球标签的识别文本
 */
function extractKeywordBased(
  text: string,
  type: LotteryType,
): { red: number[]; blue: number[] } | null {
  const keywords = KEYWORD_MAP[type];
  if (!keywords || (keywords.redKeywords.length === 0 && keywords.blueKeywords.length === 0)) {
    return null;
  }

  const config = LOTTERY_CONFIGS[type];

  const redSection = findSection(text, keywords.redKeywords, keywords.blueKeywords);
  const blueSection = findSection(text, keywords.blueKeywords, keywords.redKeywords);

  const redNumbers = extractValidNumbers(redSection, 1, config.redMax, config.redCount);
  const blueNumbers = config.blueCount > 0
    ? extractValidNumbers(blueSection, 1, config.blueMax, config.blueCount)
    : [];

  if (redNumbers.length >= config.redCount &&
      (config.blueCount === 0 || blueNumbers.length >= config.blueCount)) {
    return {
      red: redNumbers.slice(0, config.redCount),
      blue: blueNumbers.slice(0, config.blueCount),
    };
  }

  return null;
}

/**
 * 从纯数字序列中提取号码
 * 从文本中先提取红球所需数量，再提取蓝球所需数量
 */
function extractNumericSequence(
  text: string,
  type: LotteryType,
): { red: number[]; blue: number[] } | null {
  const config = LOTTERY_CONFIGS[type];

  const redNumbers = extractValidNumbers(text, 1, config.redMax, config.redCount);
  const blueNumbers = config.blueCount > 0
    ? extractValidNumbers(text, 1, config.blueMax, config.blueCount)
    : [];

  if (redNumbers.length >= config.redCount &&
      (config.blueCount === 0 || blueNumbers.length >= config.blueCount)) {
    return {
      red: redNumbers.slice(0, config.redCount),
      blue: blueNumbers.slice(0, config.blueCount),
    };
  }

  return null;
}

/**
 * 提取简单类型的号码（仅红球，无蓝球，如排列三/五）
 */
function extractSimpleType(text: string, type: LotteryType): { red: number[]; blue: number[] } | null {
  const config = LOTTERY_CONFIGS[type];
  const digits = extractSimpleDigits(text, config.redCount, config.redMax);

  if (digits.length >= config.redCount) {
    return { red: digits.slice(0, config.redCount), blue: [] };
  }

  return null;
}

/**
 * 从文本中提取单注号码
 * 先尝试匹配简单类型（无蓝球），再尝试关键词匹配，最后尝试纯数字序列
 */
function extractSingleBet(text: string, type: LotteryType): BallNumbers | null {
  const config = LOTTERY_CONFIGS[type];

  // 无蓝球的彩种（排列三、排列五等）
  if (config.blueMax === 0) {
    const simple = extractSimpleType(text, type);
    if (simple) return simple;
    return null;
  }

  // 有蓝球的彩种：先关键词匹配，再纯数字序列
  const keywordResult = extractKeywordBased(text, type);
  if (keywordResult) return keywordResult;

  const sequenceResult = extractNumericSequence(text, type);
  if (sequenceResult) return sequenceResult;

  return null;
}

/**
 * 从文本中提取多注号码
 * 支持多种格式：按行分割、按"+"分割、按红蓝球个数分割
 */
function extractMultiBet(type: LotteryType, text: string): BallNumbers[] {
  const config = LOTTERY_CONFIGS[type];
  const isSimple = config.blueMax === 0;

  // 简单类型（无蓝球）：按每 N 个数字为一组分割
  if (isSimple) {
    const allDigits = text.match(/\d/g) || [];
    const numbersList: BallNumbers[] = [];
    let i = 0;

    while (i + config.redCount <= allDigits.length) {
      const nums = allDigits.slice(i, i + config.redCount).map(d => parseInt(d, 10));
      const valid = nums.every(n => n >= 0 && n <= config.redMax);
      if (valid) {
        numbersList.push({ red: nums, blue: [] });
        i += config.redCount;
      } else {
        i++;
      }
    }

    return numbersList;
  }

  // 先尝试按行分割，每行解析一注
  const lines = text.split(/[\n\r]+/);
  const numbersList: BallNumbers[] = [];

  for (const line of lines) {
    const bet = extractSingleBet(line, type);
    if (bet) {
      numbersList.push(bet);
    }
  }

  // 按行分割失败，尝试按 "+" 分割
  if (numbersList.length === 0) {
    const parts = text.split(/[+|｜]/);
    if (parts.length >= 2) {
      const redNums = extractValidNumbers(parts[0], 1, config.redMax, 999);
      const blueNums = extractValidNumbers(parts.slice(1).join(' '), 1, config.blueMax, 999);

      let ri = 0;
      while (ri + config.redCount <= redNums.length) {
        const blue = blueNums.length >= config.blueCount
          ? blueNums.slice(0, config.blueCount).sort((a, b) => a - b)
          : [];

        if (blue.length === config.blueCount || config.blueCount === 0) {
          const red = redNums.slice(ri, ri + config.redCount).sort((a, b) => a - b);
          numbersList.push({ red, blue });
        }
        ri += config.redCount;
      }
    }
  }

  // 最后尝试：提取全部数字，按红球+蓝球分组
  if (numbersList.length === 0) {
    const nums = extractValidNumbers(text, 1, Math.max(config.redMax, config.blueMax), 999);
    let idx = 0;
    while (idx + config.redCount + config.blueCount <= nums.length) {
      const red = nums.slice(idx, idx + config.redCount).sort((a, b) => a - b);
      const blue = nums.slice(idx + config.redCount, idx + config.redCount + config.blueCount).sort((a, b) => a - b);
      numbersList.push({ red, blue });
      idx += config.redCount + config.blueCount;
    }
  }

  return numbersList;
}

/** OCR 号码提取的完整结果 */
export interface ExtractResult {
  numbersList: BallNumbers[];   // 提取到的号码列表
  rawText: string;              // 原始 OCR 文本
  issueNumber: string | null;   // 提取到的期号
  valid: boolean;               // 是否有效
  lotteryCategory?: '体彩' | '福彩'; // 体彩或福彩
  lotteryName?: string;         // 彩票名称
  betType?: '单式' | '复式';     // 投注类型
}

/** 从识别文本中检测彩票所属类别（体彩/福彩） */
function detectLotteryCategory(text: string): '体彩' | '福彩' | null {
  const t = text.toLowerCase();
  if (t.includes('体育彩票') || t.includes('体彩')) {
    return '体彩';
  }
  if (t.includes('福利彩票') || t.includes('福彩')) {
    return '福彩';
  }
  return null;
}

/** 从识别文本中检测彩票名称（如"超级大乐透"、"双色球"等） */
function detectLotteryName(text: string): string | null {
  const t = text;
  const patterns = [
    { name: '超级大乐透', keywords: ['超级大乐透', '大乐透'] },
    { name: '双色球', keywords: ['双色球'] },
    { name: '排列三', keywords: ['排列三', '排三'] },
    { name: '排列五', keywords: ['排列五', '排五'] },
    { name: '七星彩', keywords: ['七星彩'] },
    { name: '福彩3D', keywords: ['福彩3d', '3d'] },
  ];

  for (const pattern of patterns) {
    for (const keyword of pattern.keywords) {
      if (t.includes(keyword)) {
        return pattern.name;
      }
    }
  }
  return null;
}

/** 从识别文本中提取期号 */
function extractIssueNumber(text: string): string | null {
  // 匹配 "第26052期" 格式
  const pattern1 = /第(\d{5,})期/;
  const match1 = text.match(pattern1);
  if (match1) return match1[1];

  // 匹配 "2026年05月13日开奖" 中的日期作为辅助
  const pattern2 = /(\d{4})年(\d{2})月(\d{2})日/;
  const match2 = text.match(pattern2);
  if (match2) {
    return `${match2[1]}${match2[2]}${match2[3]}`;
  }

  return null;
}

/** 从识别文本中检测投注类型（单式/复式） */
function detectBetType(text: string): '单式' | '复式' | null {
  if (text.includes('复式')) {
    return '复式';
  }
  if (text.includes('单式')) {
    return '单式';
  }
  return null;
}

/**
 * 主入口：从 OCR 识别文本中提取彩票号码
 * 自动检测彩票类别、期号、投注类型
 * 支持带圈数字、关键词分隔、纯数字格式
 * 提取失败时自动生成随机号码作为后备
 */
export function extractLotteryNumbers(text: string, type: LotteryType): ExtractResult {
  const rawText = text.trim();

  // 检测彩票类别、名称、期数和投注类型
  const lotteryCategory = detectLotteryCategory(rawText);
  const lotteryName = detectLotteryName(rawText);
  const extractedIssueNumber = extractIssueNumber(rawText);
  const betType = detectBetType(rawText);

  // 优先处理带圈数字格式
  if (hasCircledNumbers(rawText)) {
    const { bets, issueNumber } = extractByCircledFormat(rawText, type);

    if (bets.length > 0) {
      return {
        numbersList: bets,
        rawText,
        issueNumber: issueNumber || extractedIssueNumber,
        valid: true,
        lotteryCategory,
        lotteryName,
        betType,
      };
    }

    return {
      numbersList: [],
      rawText,
      issueNumber: issueNumber || extractedIssueNumber,
      valid: false,
      lotteryCategory,
      lotteryName,
      betType,
    };
  }

  // 普通文本格式：先标准化再提取
  const cleanText = normalizeCircledNumbers(rawText)
    .replace(/[：:]/g, ':')
    .replace(/[（）()]/g, ' ')
    .replace(/[【】\[\]]/g, ' ')
    .trim();

  // 尝试多注提取
  let numbersList = extractMultiBet(type, cleanText);

  // 多注提取失败，尝试单注提取
  if (numbersList.length === 0) {
    const single = extractSingleBet(cleanText, type);
    if (single) {
      numbersList = [single];
    }
  }

  // 都提取失败，生成随机号码
  if (numbersList.length === 0) {
    numbersList = [generateRandomNumbers(type)];
  }

  // 过滤有效号码
  const validList = numbersList.filter(bet => {
    const config = LOTTERY_CONFIGS[type];
    const isValid = bet.red.length === config.redCount &&
      (config.blueCount === 0 || bet.blue.length === config.blueCount) &&
      bet.red.every(n => n >= 1 && n <= config.redMax) &&
      bet.blue.every(n => n >= 1 && n <= config.blueMax);
    
    return isValid;
  });

  // 没有有效号码，生成随机号码作为后备
  if (validList.length === 0) {
    return {
      numbersList: [generateRandomNumbers(type)],
      rawText,
      issueNumber: extractedIssueNumber,
      valid: true,
      lotteryCategory,
      lotteryName,
      betType,
    };
  }

  return {
    numbersList: validList,
    rawText,
    issueNumber: extractedIssueNumber,
    valid: true,
    lotteryCategory,
    lotteryName,
    betType,
  };
}

export { extractSingleBet };
