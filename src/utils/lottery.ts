import { LotteryType, LOTTERY_CONFIGS, DrawResult, BallNumbers } from '../types';

/**
 * 格式化金额显示
 * 1亿以上显示"亿"，1万以上显示"万"，否则显示数字本身
 */
export function formatMoney(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (num >= 100000000) {
    return (num / 100000000).toFixed(2) + '亿';
  }
  if (num >= 10000) {
    return (num / 10000).toFixed(2) + '万';
  }
  return num.toLocaleString();
}

/** 格式化时间戳为 YYYY-MM-DD 格式 */
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** 格式化时间戳为 YYYY-MM-DD HH:mm 格式 */
export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

/**
 * 解析开奖结果中的号码字符串为 BallNumbers
 * number 字段为红球（如 "01 02 03 04 05"），refernumber 为蓝球
 */
export function parseDrawNumbers(draw: DrawResult): BallNumbers {
  const redStr = draw.number.trim();
  const blueStr = draw.refernumber?.trim() || '';
  
  const red = redStr.split(/\s+/).map(n => parseInt(n, 10)).filter(n => !isNaN(n));
  const blue = blueStr ? blueStr.split(/\s+/).map(n => parseInt(n, 10)).filter(n => !isNaN(n)) : [];
  
  return { red, blue };
}

/**
 * 根据彩票类型生成一组随机号码
 * 红球和蓝球分别从 1~max 的范围中不重复随机选取
 * 结果按升序排序
 */
export function generateRandomNumbers(type: LotteryType): BallNumbers {
  const config = LOTTERY_CONFIGS[type];
  const red: number[] = [];
  const blue: number[] = [];
  
  while (red.length < config.redCount) {
    const num = Math.floor(Math.random() * config.redMax) + 1;
    if (!red.includes(num)) {
      red.push(num);
    }
  }
  
  while (blue.length < config.blueCount) {
    const num = Math.floor(Math.random() * config.blueMax) + 1;
    if (!blue.includes(num)) {
      blue.push(num);
    }
  }
  
  red.sort((a, b) => a - b);
  blue.sort((a, b) => a - b);
  
  return { red, blue };
}

/**
 * 计算中奖等级
 * 根据用户号码与开奖号码的红球/蓝球匹配数量，判断中奖等级和奖金
 * 目前支持大乐透和双色球的中奖规则
 * @returns 中奖等级信息（含等级编号、名称、奖金），未中奖返回 null
 */
export function calculatePrize(
  type: LotteryType,
  userNumbers: BallNumbers,
  drawNumbers: BallNumbers
): { level: number; name: string; bonus: number } | null {
  const matchedRed = userNumbers.red.filter(n => drawNumbers.red.includes(n)).length;
  const matchedBlue = userNumbers.blue.filter(n => drawNumbers.blue.includes(n)).length;

  // 大乐透中奖规则
  if (type === LotteryType.DALETOU) {
    if (matchedRed === 5 && matchedBlue === 2) return { level: 1, name: '一等奖', bonus: 10000000 };
    if (matchedRed === 5 && matchedBlue === 1) return { level: 2, name: '二等奖', bonus: 100000 };
    if (matchedRed === 5 && matchedBlue === 0) return { level: 3, name: '三等奖', bonus: 10000 };
    if (matchedRed === 4 && matchedBlue === 2) return { level: 4, name: '四等奖', bonus: 3000 };
    if (matchedRed === 4 && matchedBlue === 1) return { level: 5, name: '五等奖', bonus: 300 };
    if (matchedRed === 3 && matchedBlue === 2) return { level: 6, name: '六等奖', bonus: 200 };
    if (matchedRed === 4 && matchedBlue === 0) return { level: 7, name: '七等奖', bonus: 100 };
    if (matchedRed === 3 && matchedBlue === 1) return { level: 8, name: '八等奖', bonus: 15 };
    if (matchedRed === 2 && matchedBlue === 2) return { level: 8, name: '八等奖', bonus: 15 };
    if (matchedRed === 3 && matchedBlue === 0) return { level: 9, name: '九等奖', bonus: 5 };
    if (matchedRed === 1 && matchedBlue === 2) return { level: 9, name: '九等奖', bonus: 5 };
    if (matchedRed === 0 && matchedBlue === 2) return { level: 9, name: '九等奖', bonus: 5 };
  }
  // 双色球中奖规则
  else if (type === LotteryType.SHUANGSEQIU) {
    if (matchedRed === 6 && matchedBlue === 1) return { level: 1, name: '一等奖', bonus: 5000000 };
    if (matchedRed === 6 && matchedBlue === 0) return { level: 2, name: '二等奖', bonus: 100000 };
    if (matchedRed === 5 && matchedBlue === 1) return { level: 3, name: '三等奖', bonus: 3000 };
    if (matchedRed === 5 && matchedBlue === 0) return { level: 4, name: '四等奖', bonus: 200 };
    if (matchedRed === 4 && matchedBlue === 1) return { level: 4, name: '四等奖', bonus: 200 };
    if (matchedRed === 4 && matchedBlue === 0) return { level: 5, name: '五等奖', bonus: 10 };
    if (matchedRed === 3 && matchedBlue === 1) return { level: 5, name: '五等奖', bonus: 10 };
    if (matchedRed === 2 && matchedBlue === 1) return { level: 6, name: '六等奖', bonus: 5 };
    if (matchedRed === 1 && matchedBlue === 1) return { level: 6, name: '六等奖', bonus: 5 };
    if (matchedRed === 0 && matchedBlue === 1) return { level: 6, name: '六等奖', bonus: 5 };
  }

  return null;
}
