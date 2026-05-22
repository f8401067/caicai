export enum LotteryType {
  DALETOU = 'daletou',
  SHUANGSEQIU = 'shuangseqiu',
  PAILIE3 = 'pailie3',
  PAILIE5 = 'pailie5',
  QIXINGCAI = 'qixingcai',
  FUCAI3D = 'fucai3d'
}

export interface BallNumbers {
  red: number[];
  blue: number[];
}

export interface LotteryRecord {
  id: string;
  type: LotteryType;
  numbers: BallNumbers;
  bets?: Array<{ numbers: BallNumbers }>; // 多注合并
  multiples: number;
  isAppend: boolean;
  issue: string;
  issues: number;
  amount: number;
  isReal: boolean;
  status: 'pending' | 'won' | 'not_won';
  wonAmount?: number;
  createdAt: number;
  updatedAt: number;
}

export interface VerifyRecordBet {
  numbers: BallNumbers;
  matched: BallNumbers;
  prize?: string;
  wonAmount?: number;
}

export interface VerifyRecord {
  id: string;
  type: LotteryType;
  numbers: BallNumbers; // 保留兼容，第一注
  bets: VerifyRecordBet[]; // 所有注
  drawResult?: BallNumbers;
  matched: BallNumbers; // 保留兼容，第一注匹配
  prize?: string;
  wonAmount?: number;
  amount?: number;
  createdAt: number;
}

export interface Prize {
  name: string;
  num: number;
  singlebonus: number;
  require?: string;
  addAmount?: number;
}

export interface DrawResult {
  caipiaoid: number;
  issueno: string;
  number: string;
  refernumber: string;
  opendate: string;
  saleamount?: number;
  totalmoney?: string;
  prize: Prize[];
}

export interface LotteryConfig {
  type: LotteryType;
  name: string;
  caipiaoid: number;
  redCount: number;
  redMax: number;
  blueCount: number;
  blueMax: number;
  hasAppend: boolean;
  price: number;
}

export const LOTTERY_CONFIGS: Record<LotteryType, LotteryConfig> = {
  [LotteryType.DALETOU]: {
    type: LotteryType.DALETOU,
    name: '大乐透',
    caipiaoid: 14,
    redCount: 5,
    redMax: 35,
    blueCount: 2,
    blueMax: 12,
    hasAppend: true,
    price: 2
  },
  [LotteryType.SHUANGSEQIU]: {
    type: LotteryType.SHUANGSEQIU,
    name: '双色球',
    caipiaoid: 11,
    redCount: 6,
    redMax: 33,
    blueCount: 1,
    blueMax: 16,
    hasAppend: false,
    price: 2
  },
  [LotteryType.PAILIE3]: {
    type: LotteryType.PAILIE3,
    name: '排列三',
    caipiaoid: 16,
    redCount: 3,
    redMax: 9,
    blueCount: 0,
    blueMax: 0,
    hasAppend: false,
    price: 2
  },
  [LotteryType.PAILIE5]: {
    type: LotteryType.PAILIE5,
    name: '排列五',
    caipiaoid: 17,
    redCount: 5,
    redMax: 9,
    blueCount: 0,
    blueMax: 0,
    hasAppend: false,
    price: 2
  },
  [LotteryType.QIXINGCAI]: {
    type: LotteryType.QIXINGCAI,
    name: '七星彩',
    caipiaoid: 15,
    redCount: 7,
    redMax: 9,
    blueCount: 0,
    blueMax: 0,
    hasAppend: false,
    price: 2
  },
  [LotteryType.FUCAI3D]: {
    type: LotteryType.FUCAI3D,
    name: '福彩3D',
    caipiaoid: 12,
    redCount: 3,
    redMax: 9,
    blueCount: 0,
    blueMax: 0,
    hasAppend: false,
    price: 2
  }
};

export const DEFAULT_ENABLED_TYPES = [LotteryType.DALETOU, LotteryType.SHUANGSEQIU];
