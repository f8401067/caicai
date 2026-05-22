import { LotteryType, BallNumbers, LOTTERY_CONFIGS } from '../types';
import { generateRandomNumbers } from './lottery';

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
  [LotteryType.PAILIE3]: { redKeywords: [], blueKeywords: [] },
  [LotteryType.PAILIE5]: { redKeywords: [], blueKeywords: [] },
  [LotteryType.QIXINGCAI]: { redKeywords: [], blueKeywords: [] },
  [LotteryType.FUCAI3D]: { redKeywords: [], blueKeywords: [] },
};

const CIRCLED_CHARS =
  String.fromCodePoint(...Array.from({ length: 20 }, (_, i) => 0x2460 + i)) +
  String.fromCodePoint(...Array.from({ length: 15 }, (_, i) => 0x3251 + i)) +
  String.fromCodePoint(...Array.from({ length: 10 }, (_, i) => 0x2776 + i)) +
  String.fromCodePoint(...Array.from({ length: 10 }, (_, i) => 0x24EB + i));

function hasCircledNumbers(text: string): boolean {
  for (const ch of CIRCLED_CHARS) {
    if (text.includes(ch)) return true;
  }
  return false;
}

function normalizeCircledNumbers(text: string): string {
  let result = text;
  for (let i = 0; i < 20; i++) {
    result = result.replace(new RegExp(String.fromCodePoint(0x2460 + i), 'g'), String(i + 1));
  }
  for (let i = 0; i < 15; i++) {
    result = result.replace(new RegExp(String.fromCodePoint(0x3251 + i), 'g'), String(i + 21));
  }
  for (let i = 0; i < 10; i++) {
    result = result.replace(new RegExp(String.fromCodePoint(0x2776 + i), 'g'), String(i + 1));
  }
  for (let i = 0; i < 10; i++) {
    result = result.replace(new RegExp(String.fromCodePoint(0x24EB + i), 'g'), String(i + 11));
  }
  return result;
}

function extractValidNumbers(text: string, min: number, max: number, count: number): number[] {
  const result: number[] = [];
  const seen = new Set<number>();

  // 首先尝试按空格分割，然后处理每个部分
  const parts = text.trim().split(/\s+/);
  
  for (const part of parts) {
    if (result.length >= count) break;
    
    // 如果部分长度大于2，可能是连续的数字（如 "0912131724"）
    if (part.length > 2 && /^\d+$/.test(part)) {
      // 按两位一组分割
      for (let i = 0; i < part.length && result.length < count; i += 2) {
        const numStr = part.substring(i, i + 2);
        // 如果只剩一位数字，也尝试解析
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

// 提取数字但不排序，保持原始顺序
function extractValidNumbersUnsorted(text: string, min: number, max: number, count: number): number[] {
  const result: number[] = [];
  const seen = new Set<number>();

  const parts = text.trim().split(/\s+/);
  
  for (const part of parts) {
    if (result.length >= count) break;
    
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

function extractByCircledFormat(
  rawText: string,
  type: LotteryType,
): { bets: BallNumbers[]; issueNumber: string | null } {
  const config = LOTTERY_CONFIGS[type];

  const parts = rawText.split(new RegExp(`[${CIRCLED_CHARS}]`));
  const prefix = parts[0] || '';

  const issueMatch = prefix.match(/第(\d{5,})期/);
  const issueNumber = issueMatch ? issueMatch[1] : null;

  const bets: BallNumbers[] = [];

  for (let i = 1; i < parts.length; i++) {
    const segment = normalizeCircledNumbers(parts[i]);
    const cleaned = segment
      .replace(/[：:]/g, ':')
      .replace(/[（）()]/g, ' ')
      .replace(/[【】\[\]]/g, ' ')
      .replace(/\n+/g, ' ')  // 将换行符替换为空格
      .trim();

    if (!cleaned) continue;

    // 尝试找到红球和蓝球的分隔符（+号或空格分隔的两组数字）
    const plusIdx = cleaned.search(/[+＋]/);
    let redText = '';
    let blueText = '';

    if (plusIdx >= 0) {
      // 有+号分隔
      redText = cleaned.slice(0, plusIdx);
      blueText = cleaned.slice(plusIdx + 1);
    } else {
      // 没有+号，按空格分割
      const spaceParts = cleaned.trim().split(/\s+/);
      
      if (spaceParts.length >= 2) {
        // 第一部分是红球（连续数字如 0912131724 或 0106091516）
        const firstPart = spaceParts[0];
        
        // 从第一部分提取红球号码
        const redNumsArray = extractValidNumbersUnsorted(firstPart, 1, config.redMax, config.redCount);
        redText = redNumsArray.join(' ');
        
        // 蓝球是剩余部分的前几个数字
        // 找到第一个非数字文本的位置，只取前面的数字部分
        let blueParts = [];
        for (let j = 1; j < spaceParts.length; j++) {
          const part = spaceParts[j];
          // 如果是纯数字或两位数字，可能是蓝球
          if (/^\d{1,2}$/.test(part)) {
            blueParts.push(part);
          } else {
            // 遇到非数字文本，停止
            break;
          }
        }
        blueText = blueParts.join(' ');
      } else {
        // 只有一部分，全部作为红球
        redText = cleaned;
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

function findSection(text: string, keywords: string[], nextKeywords: string[]): string {
  const allNext = [...keywords, ...nextKeywords];
  let bestIdx = -1;
  let bestKeyword = '';

  for (const kw of keywords) {
    const idx = text.indexOf(kw);
    if (idx !== -1 && (bestIdx === -1 || idx < bestIdx)) {
      bestIdx = idx;
      bestKeyword = kw;
    }
  }

  if (bestIdx === -1) return '';

  let endIdx = text.length;
  for (const nk of allNext) {
    const nidx = text.indexOf(nk, bestIdx + bestKeyword.length);
    if (nidx !== -1 && nidx < endIdx) {
      endIdx = nidx;
    }
  }

  return text.slice(bestIdx + bestKeyword.length, endIdx);
}

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

function extractSimpleType(text: string, type: LotteryType): { red: number[]; blue: number[] } | null {
  const config = LOTTERY_CONFIGS[type];
  const digits = extractSimpleDigits(text, config.redCount, config.redMax);

  if (digits.length >= config.redCount) {
    return { red: digits.slice(0, config.redCount), blue: [] };
  }

  return null;
}

function extractSingleBet(text: string, type: LotteryType): BallNumbers | null {
  const config = LOTTERY_CONFIGS[type];

  if (config.blueMax === 0) {
    const simple = extractSimpleType(text, type);
    if (simple) return simple;
    return null;
  }

  const keywordResult = extractKeywordBased(text, type);
  if (keywordResult) return keywordResult;

  const sequenceResult = extractNumericSequence(text, type);
  if (sequenceResult) return sequenceResult;

  return null;
}

function extractMultiBet(type: LotteryType, text: string): BallNumbers[] {
  const config = LOTTERY_CONFIGS[type];
  const isSimple = config.blueMax === 0;

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

  // 先尝试按行分割
  const lines = text.split(/[\n\r]+/);
  const numbersList: BallNumbers[] = [];

  for (const line of lines) {
    const bet = extractSingleBet(line, type);
    if (bet) {
      numbersList.push(bet);
    }
  }

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

export interface ExtractResult {
  numbersList: BallNumbers[];
  rawText: string;
  issueNumber: string | null;
  valid: boolean;
  lotteryCategory?: '体彩' | '福彩'; // 体彩或福彩
  lotteryName?: string; // 彩票种类名称
  betType?: '单式' | '复式'; // 单式或复式
}

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

function extractIssueNumber(text: string): string | null {
  // 匹配 "第26052期" 格式
  const pattern1 = /第(\d{5,})期/;
  const match1 = text.match(pattern1);
  if (match1) return match1[1];

  // 匹配 "2026年05月13日开奖" 中的日期作为辅助
  const pattern2 = /(\d{4})年(\d{2})月(\d{2})日/;
  const match2 = text.match(pattern2);
  if (match2) {
    // 返回日期格式的期号（可选）
    return `${match2[1]}${match2[2]}${match2[3]}`;
  }

  return null;
}

function detectBetType(text: string): '单式' | '复式' | null {
  if (text.includes('复式')) {
    return '复式';
  }
  if (text.includes('单式')) {
    return '单式';
  }
  // 默认根据号码数量判断：如果红球或蓝球数量超过基本配置，则为复式
  return null;
}

export function extractLotteryNumbers(text: string, type: LotteryType): ExtractResult {
  const rawText = text.trim();

  // 检测彩票类别、名称、期数和投注类型
  const lotteryCategory = detectLotteryCategory(rawText);
  const lotteryName = detectLotteryName(rawText);
  const extractedIssueNumber = extractIssueNumber(rawText);
  const betType = detectBetType(rawText);

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

  const cleanText = normalizeCircledNumbers(rawText)
    .replace(/[：:]/g, ':')
    .replace(/[（）()]/g, ' ')
    .replace(/[【】\[\]]/g, ' ')
    .trim();

  let numbersList = extractMultiBet(type, cleanText);

  if (numbersList.length === 0) {
    const single = extractSingleBet(cleanText, type);
    if (single) {
      numbersList = [single];
    }
  }

  if (numbersList.length === 0) {
    numbersList = [generateRandomNumbers(type)];
  }

  const validList = numbersList.filter(bet => {
    const config = LOTTERY_CONFIGS[type];
    const isValid = bet.red.length === config.redCount &&
      (config.blueCount === 0 || bet.blue.length === config.blueCount) &&
      bet.red.every(n => n >= 1 && n <= config.redMax) &&
      bet.blue.every(n => n >= 1 && n <= config.blueMax);
    
    return isValid;
  });

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