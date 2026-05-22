import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  LotteryType,
  LotteryRecord,
  VerifyRecord,
  DrawResult,
  DEFAULT_ENABLED_TYPES,
  BallNumbers
} from '../types';

interface AppStore {
  // 当前选中的彩票类型
  currentType: LotteryType;
  setCurrentType: (type: LotteryType) => void;

  // 开奖结果
  drawResults: Record<LotteryType, DrawResult | null>;
  setDrawResult: (type: LotteryType, result: DrawResult) => void;
  clearDrawResults: () => void;

  // 历史开奖结果（多期）
  drawHistory: Record<LotteryType, DrawResult[]>;
  addDrawHistory: (type: LotteryType, results: DrawResult[]) => void;
  prependDrawHistory: (type: LotteryType, result: DrawResult) => void;

  // 购彩记录
  records: LotteryRecord[];
  addRecord: (record: Omit<LotteryRecord, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateRecord: (id: string, updates: Partial<LotteryRecord>) => void;
  deleteRecord: (id: string) => void;
  clearRecords: () => void;

  // 验证历史
  verifyRecords: VerifyRecord[];
  addVerifyRecord: (record: Omit<VerifyRecord, 'id' | 'createdAt'>) => void;
  clearVerifyRecords: () => void;

  // 用户设置
  enabledTypes: LotteryType[];
  toggleLotteryType: (type: LotteryType) => void;

  // OCR设置
  ocrConfig: {
    provider: 'tesseract' | 'baidu';
    baiduApiKey: string;
    baiduSecretKey: string;
  };
  setOcrConfig: (config: Partial<AppStore['ocrConfig']>) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // 当前选中的彩票类型
      currentType: LotteryType.DALETOU,
      setCurrentType: (type) => set({ currentType: type }),

      // 开奖结果 - 不持久化，每次启动重新获取
      drawResults: {} as Record<LotteryType, DrawResult | null>,
      setDrawResult: (type, result) =>
        set((state) => ({
          drawResults: { ...state.drawResults, [type]: result }
        })),
      clearDrawResults: () => set({ drawResults: {} as Record<LotteryType, DrawResult | null> }),

      // 历史开奖结果
      drawHistory: {} as Record<LotteryType, DrawResult[]>,
      addDrawHistory: (type, results) =>
        set((state) => ({
          drawHistory: { ...state.drawHistory, [type]: results }
        })),
      prependDrawHistory: (type, result) =>
        set((state) => {
          const history = state.drawHistory[type] || [];
          if (history.some(r => r.issueno === result.issueno)) {
            return state;
          }
          return {
            drawHistory: {
              ...state.drawHistory,
              [type]: [result, ...history]
            }
          };
        }),

      // 购彩记录
      records: [],
      addRecord: (record) => {
        const newRecord: LotteryRecord = {
          ...record,
          id: Date.now().toString(),
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        set((state) => ({
          records: [newRecord, ...state.records]
        }));
      },
      updateRecord: (id, updates) =>
        set((state) => ({
          records: state.records.map((r) =>
            r.id === id ? { ...r, ...updates, updatedAt: Date.now() } : r
          )
        })),
      deleteRecord: (id) =>
        set((state) => ({
          records: state.records.filter((r) => r.id !== id)
        })),
      clearRecords: () => set({ records: [] }),

      // 验证历史
      verifyRecords: [],
      addVerifyRecord: (record) => {
        const newRecord: VerifyRecord = {
          ...record,
          id: Date.now().toString(),
          createdAt: Date.now()
        };
        set((state) => {
          // 检查是否已存在相同的验奖记录（相同类型、相同所有注的号码）
          const recordBetsKey = (record.bets || []).map(b => 
            `${JSON.stringify(b.numbers.red)}_${JSON.stringify(b.numbers.blue)}`
          ).sort().join('|');
          
          const isDuplicate = state.verifyRecords.some(existing => {
            const existingBetsKey = (existing.bets || []).map(b => 
              `${JSON.stringify(b.numbers.red)}_${JSON.stringify(b.numbers.blue)}`
            ).sort().join('|');
            return existing.type === record.type && existingBetsKey === recordBetsKey;
          });
          
          // 如果已存在，不添加重复记录
          if (isDuplicate) {
            return state;
          }
          
          return {
            verifyRecords: [newRecord, ...state.verifyRecords]
          };
        });
      },
      clearVerifyRecords: () => set({ verifyRecords: [] }),

      // 用户设置
      enabledTypes: DEFAULT_ENABLED_TYPES,
      toggleLotteryType: (type) =>
        set((state) => {
          const isEnabled = state.enabledTypes.includes(type);
          return {
            enabledTypes: isEnabled
              ? state.enabledTypes.filter((t) => t !== type)
              : [...state.enabledTypes, type]
          };
        }),

      // OCR设置
      ocrConfig: {
        provider: 'tesseract',
        baiduApiKey: '',
        baiduSecretKey: '',
      },
      setOcrConfig: (config) =>
        set((state) => ({
          ocrConfig: { ...state.ocrConfig, ...config }
        })),
    }),
    {
      name: 'caicai-storage',
      partialize: (state) => ({
        currentType: state.currentType,
        records: state.records,
        verifyRecords: state.verifyRecords,
        enabledTypes: state.enabledTypes,
        drawHistory: state.drawHistory,
        ocrConfig: state.ocrConfig,
      })
    }
  )
);
