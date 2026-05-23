// ==================== 彩票类型枚举 ====================
// 定义支持的六种彩票种类
export enum LotteryType {
  DALETOU = 'daletou',       // 体彩超级大乐透
  SHUANGSEQIU = 'shuangseqiu', // 福彩双色球
  PAILIE3 = 'pailie3',       // 体彩排列三
  PAILIE5 = 'pailie5',       // 体彩排列五
  QIXINGCAI = 'qixingcai',   // 体彩七星彩
  FUCAI3D = 'fucai3d'        // 福彩3D
}

/** 彩票号码：红球和蓝球的数字数组 */
export interface BallNumbers {
  red: number[];   // 红球（前区）号码
  blue: number[];  // 蓝球（后区）号码
}

/** 购彩记录：存储用户每笔投注的完整信息 */
export interface LotteryRecord {
  id: string;                               // 唯一标识
  type: LotteryType;                        // 彩票类型
  numbers: BallNumbers;                     // 号码（单注兼容）
  bets?: Array<{ numbers: BallNumbers }>;   // 多注号码（一次多注合并录入时使用）
  multiples: number;                        // 倍投数
  isAppend: boolean;                        // 是否追加投注（仅大乐透支持）
  issue: string;                            // 期号
  issues: number;                           // 多期投注期数（如投5期则 issues=5）
  amount: number;                           // 总金额（元）
  isReal: boolean;                          // 是否为真实购票
  status: 'pending' | 'won' | 'not_won';   // 开奖状态
  wonAmount?: number;                       // 中奖金额
  createdAt: number;                        // 创建时间戳
  updatedAt: number;                        // 更新时间戳
}

/** 验奖记录中每一注的详情 */
export interface VerifyRecordBet {
  numbers: BallNumbers;    // 该注号码
  matched: BallNumbers;    // 与开奖号码匹配的球
  prize?: string;          // 中奖等级名称
  wonAmount?: number;      // 中奖金额
}

/** 验奖记录：扫码验奖的历史结果 */
export interface VerifyRecord {
  id: string;                        // 唯一标识
  type: LotteryType;                 // 彩票类型
  numbers: BallNumbers;              // 第一注号码
  bets: VerifyRecordBet[];           // 所有注的验奖结果
  drawResult?: BallNumbers;          // 开奖号码
  matched: BallNumbers;              // 第一注匹配结果（兼容保留）
  prize?: string;                    // 第一注中奖等级
  wonAmount?: number;                // 总中奖金额
  amount?: number;                   // 票面金额
  createdAt: number;                 // 创建时间戳
}

/** 中奖地区信息 */
export interface WinnerRegion {
  province: string;      // 省份
  city?: string;         // 城市（福彩有，体彩可能没有）
  count: number;         // 中奖注数
}

/** 开奖结果中的奖项信息 */
export interface Prize {
  name: string;         // 奖项名称（如"一等奖"）
  num: number;          // 中奖注数
  singlebonus: number;  // 单注奖金（元）
  require?: string;     // 中奖条件
  addAmount?: number;   // 追加奖金
  regions?: WinnerRegion[]; // 中奖地区分布
}

/** 开奖结果数据（来自开奖API） */
export interface DrawResult {
  caipiaoid: number;     // 彩种ID
  issueno: string;       // 期号
  number: string;        // 开奖号码（红球/前区）
  refernumber: string;   // 特别号码（蓝球/后区）
  opendate: string;      // 开奖日期
  saleamount?: number;   // 销售额
  totalmoney?: string;   // 奖池金额
  prize: Prize[];        // 各奖项详情
}

/** 彩票配置：定义每种彩票的规则参数 */
export interface LotteryConfig {
  type: LotteryType;    // 彩票类型
  name: string;         // 中文名称
  caipiaoid: number;    // API中的彩种ID
  redCount: number;     // 红球选取个数
  redMax: number;       // 红球最大号码
  blueCount: number;    // 蓝球选取个数
  blueMax: number;      // 蓝球最大号码
  hasAppend: boolean;   // 是否支持追加
  price: number;        // 单注价格（元）
}

/** 所有彩票类型的配置映射表 */
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

/** 默认启用的彩种（首页标签栏仅显示这些） */
export const DEFAULT_ENABLED_TYPES = [LotteryType.DALETOU, LotteryType.SHUANGSEQIU];
