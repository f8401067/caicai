import React, { useState, useMemo, useEffect } from 'react';
import { Trash2, Trophy, Calendar, Clock, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { LotteryRecord, LotteryType, LOTTERY_CONFIGS, BallNumbers } from '../types';
import { formatDate, formatMoney, parseDrawNumbers, calculatePrize } from '../utils/lottery';
import { Ball } from '../components/common/Ball';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';

/** 匹配结果接口 */
interface MatchResult {
  drawResult: import('../types').DrawResult;
  matchedRed: number[];
  matchedBlue: number[];
  unmatchedRed: number[];
  unmatchedBlue: number[];
  prize: { level: number; name: string; bonus: number } | null;
}

/** 状态筛选选项类型 */
type FilterType = 'all' | 'pending' | 'won' | 'not_won';

/**
 * 购彩记录页面
 * 展示用户录入的所有购彩记录，支持状态筛选和彩种筛选
 */
export default function Records() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterType>('pending');
  const [typeFilter, setTypeFilter] = useState<'all' | LotteryType>('all');
  const [statusOpen, setStatusOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const statusOptions: { value: FilterType; label: string }[] = [
    { value: 'all', label: '全部' },
    { value: 'pending', label: '待开奖' },
    { value: 'won', label: '已中奖' },
    { value: 'not_won', label: '未中奖' },
  ];

  const { records, deleteRecord, drawHistory, updateRecord } = useAppStore();

  /** 匹配结果缓存 */
  const [matchResults, setMatchResults] = useState<Record<string, MatchResult[]>>({});

  /** 号码匹配函数 */
  const matchNumbers = (
    type: LotteryType,
    userNumbers: BallNumbers,
    drawResult: import('../types').DrawResult
  ): MatchResult => {
    const drawNumbers = parseDrawNumbers(drawResult);
    const prize = calculatePrize(type, userNumbers, drawNumbers);
    
    const matchedRed = userNumbers.red.filter(n => drawNumbers.red.includes(n));
    const matchedBlue = userNumbers.blue.filter(n => drawNumbers.blue.includes(n));
    const unmatchedRed = userNumbers.red.filter(n => !drawNumbers.red.includes(n));
    const unmatchedBlue = userNumbers.blue.filter(n => !drawNumbers.blue.includes(n));
    
    return {
      drawResult,
      matchedRed,
      matchedBlue,
      unmatchedRed,
      unmatchedBlue,
      prize
    };
  };

  /** 自动匹配所有记录 */
  useEffect(() => {
    const newMatchResults: Record<string, MatchResult[]> = {};
    let hasUpdates = false;

    records.forEach(record => {
      const allBets = record.bets || [{ numbers: record.numbers }];
      const recordMatchResults: MatchResult[] = [];
      
      allBets.forEach((bet, betIndex) => {
        // 如果该注已经有匹配结果且状态不是pending，跳过
        if (matchResults[record.id] && matchResults[record.id][betIndex] && record.status !== 'pending') {
          recordMatchResults.push(matchResults[record.id][betIndex]);
          return;
        }

        // 在历史开奖记录中查找对应期号
        const history = drawHistory[record.type] || [];
        const drawResult = history.find(r => {
          // 处理多期票
          const baseIssue = parseInt(record.issue, 10);
          const targetIssue = String(baseIssue + betIndex);
          return r.issueno === targetIssue;
        });

        if (drawResult) {
          // 找到了对应的开奖记录，进行匹配
          const matchResult = matchNumbers(record.type, bet.numbers, drawResult);
          recordMatchResults.push(matchResult);
          
          // 如果是待开奖状态，更新为已开奖状态
          if (record.status === 'pending') {
            hasUpdates = true;
            const wonAmount = matchResult.prize 
              ? matchResult.prize.bonus * record.multiples 
              : 0;
            
            updateRecord(record.id, {
              status: wonAmount > 0 ? 'won' : 'not_won',
              wonAmount: wonAmount > 0 ? wonAmount : undefined
            });
          }
        }
      });

      newMatchResults[record.id] = recordMatchResults;
    });

    // 只有在有更新时才重新设置
    if (hasUpdates || Object.keys(newMatchResults).length > 0) {
      setMatchResults(newMatchResults);
    }
  }, [records, drawHistory]);

  // 记录中出现的彩种
  const availableTypes = useMemo(() => {
    const types = new Set<LotteryType>();
    records.forEach(r => types.add(r.type));
    return Array.from(types).sort();
  }, [records]);

  // 展开多期票为多项
  const expandedRecords = useMemo(() => {
    const result: Array<{ record: LotteryRecord; displayIssue: string; displayAmount: number; periodIndex: number }> = [];
    for (const record of records) {
      if (record.issues > 1) {
        for (let i = 0; i < record.issues; i++) {
          const baseIssue = parseInt(record.issue, 10);
          result.push({
            record,
            displayIssue: String(baseIssue + i),
            displayAmount: record.amount / record.issues,
            periodIndex: i,
          });
        }
      } else {
        result.push({
          record,
          displayIssue: record.issue,
          displayAmount: record.amount,
          periodIndex: 0,
        });
      }
    }
    return result;
  }, [records]);

  const filteredRecords = useMemo(() => {
    let result = expandedRecords;
    if (filter !== 'all') {
      result = result.filter(({ record }) => record.status === filter);
    }
    if (typeFilter !== 'all') {
      result = result.filter(({ record }) => record.type === typeFilter);
    }
    return result;
  }, [expandedRecords, filter, typeFilter]);

  const getMatchResult = (record: LotteryRecord, betIndex: number = 0): MatchResult | null => {
    const results = matchResults[record.id];
    return results && results[betIndex] ? results[betIndex] : null;
  };

  const getTotalPrize = (record: LotteryRecord) => {
    const results = matchResults[record.id];
    if (!results || results.length === 0) return null;
    
    const wonAmount = results.reduce((total, result) => {
      if (result.prize) {
        return total + result.prize.bonus * record.multiples;
      }
      return total;
    }, 0);
    
    return wonAmount > 0 ? wonAmount : null;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return { text: '待开奖', color: 'text-yellow-400', icon: Clock };
      case 'won':
        return { text: '已中奖', color: 'text-green-400', icon: Trophy };
      case 'not_won':
        return { text: '未中奖', color: 'text-gray-400', icon: null };
      default:
        return { text: '未知', color: 'text-gray-400', icon: null };
    }
  };

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800 px-4 py-2.5">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">购彩记录</h1>
          <Button onClick={() => navigate('/records/new')} className="px-3 py-1.5 text-sm">
            新增
          </Button>
        </div>
        
        <div className="flex gap-2 mt-2">
          {/* 状态下拉 */}
          <div className="relative flex-1">
            <button
              onClick={() => { setStatusOpen(!statusOpen); setTypeOpen(false); }}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-700 text-white hover:bg-gray-600 transition-colors"
            >
              <span>{statusOptions.find(o => o.value === filter)?.label}</span>
              <ChevronDown className="w-3.5 h-3.5 ml-1 opacity-60" />
            </button>
            {statusOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setStatusOpen(false)} />
                <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden z-20">
                  {statusOptions.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => { setFilter(value); setStatusOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                        filter === value ? 'bg-amber-500/20 text-amber-400' : 'text-white hover:bg-gray-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* 彩种下拉 */}
          <div className="relative flex-1">
            <button
              onClick={() => { setTypeOpen(!typeOpen); setStatusOpen(false); }}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-700 text-white hover:bg-gray-600 transition-colors"
            >
              <span>{typeFilter === 'all' ? '全部彩种' : LOTTERY_CONFIGS[typeFilter].name}</span>
              <ChevronDown className="w-3.5 h-3.5 ml-1 opacity-60" />
            </button>
            {typeOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setTypeOpen(false)} />
                <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden z-20">
                  <button
                    onClick={() => { setTypeFilter('all'); setTypeOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                      typeFilter === 'all' ? 'bg-amber-500/20 text-amber-400' : 'text-white hover:bg-gray-700'
                    }`}
                  >
                    全部彩种
                  </button>
                  {availableTypes.map(type => (
                    <button
                      key={type}
                      onClick={() => { setTypeFilter(type); setTypeOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                        typeFilter === type ? 'bg-amber-500/20 text-amber-400' : 'text-white hover:bg-gray-700'
                      }`}
                    >
                      {LOTTERY_CONFIGS[type].name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="p-3 space-y-2">
        {filteredRecords.length === 0 ? (
        <div className="py-12 text-center text-gray-400">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-600" />
          <p className="text-sm">暂无购彩记录</p>
          <Button onClick={() => navigate('/records/new')} className="mt-3 text-sm">
            去添加
          </Button>
        </div>
      ) : (
        filteredRecords.map(({ record, displayIssue, displayAmount, periodIndex }) => {
          const statusInfo = getStatusColor(record.status);
          const StatusIcon = statusInfo.icon;
          const totalPrize = getTotalPrize(record);
          const matchResult = getMatchResult(record, periodIndex);
          const config = LOTTERY_CONFIGS[record.type];

          return (
            <Card key={`${record.id}-${periodIndex}`} className="p-3">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm">{config.name}</span>
                    <span className="text-xs text-gray-400">
                      第{displayIssue}期
                      {record.issues > 1 && (
                        <span className="text-blue-400 ml-1">({periodIndex + 1}/{record.issues})</span>
                      )}
                    </span>
                    {record.bets && record.bets.length > 1 && (
                      <span className="text-xs text-amber-400">{record.bets.length}注</span>
                    )}
                    {record.isReal && (
                      <span className="text-xs bg-blue-500 px-1.5 py-0.5 rounded-full">
                        真实
                      </span>
                    )}
                    {!record.isReal && (
                      <span className="text-xs bg-gray-600 px-1.5 py-0.5 rounded-full">
                        模拟
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDate(record.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`flex items-center gap-0.5 text-xs ${statusInfo.color}`}>
                    {StatusIcon && <StatusIcon className="w-3.5 h-3.5" />}
                    <span>{statusInfo.text}</span>
                  </div>
                  <button
                    onClick={() => setConfirmDeleteId(record.id)}
                    className="p-1 text-gray-400 hover:text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 显示所有注 */}
              {(record.bets || [{ numbers: record.numbers }]).map((bet, betIdx) => {
                const singleMatchResult = getMatchResult(record, betIdx);
                const isMatched = singleMatchResult !== null;
                
                return (
                  <div key={betIdx} className={`flex gap-1.5 flex-wrap items-center justify-center py-1.5 ${betIdx > 0 ? 'border-t border-gray-700/50' : ''}`}>
                    <span className="text-xs text-gray-500 mr-1">第{betIdx + 1}注</span>
                    
                    {/* 红球 */}
                    {isMatched ? (
                      <>
                        {singleMatchResult.matchedRed.map((num) => (
                          <Ball key={`mr-${betIdx}-${num}`} number={num} type="red" size="md" matched={true} />
                        ))}
                        {singleMatchResult.unmatchedRed.map((num) => (
                          <Ball key={`ur-${betIdx}-${num}`} number={num} type="red" size="md" matched={false} />
                        ))}
                      </>
                    ) : (
                      bet.numbers.red.map((num, i) => (
                        <Ball key={`r-${betIdx}-${i}`} number={num} type="red" size="md" matched={true} />
                      ))
                    )}
                    
                    {bet.numbers.blue.length > 0 && (
                      <div className="w-px h-4 bg-gray-600 mx-0.5" />
                    )}
                    
                    {/* 蓝球 */}
                    {isMatched && bet.numbers.blue.length > 0 ? (
                      <>
                        {singleMatchResult.matchedBlue.map((num) => (
                          <Ball key={`mb-${betIdx}-${num}`} number={num} type="blue" size="md" matched={true} />
                        ))}
                        {singleMatchResult.unmatchedBlue.map((num) => (
                          <Ball key={`ub-${betIdx}-${num}`} number={num} type="blue" size="md" matched={false} />
                        ))}
                      </>
                    ) : (
                      bet.numbers.blue.map((num, i) => (
                        <Ball key={`b-${betIdx}-${i}`} number={num} type="blue" size="md" matched={true} />
                      ))
                    )}
                    
                    {/* 显示中奖等级 */}
                    {isMatched && singleMatchResult.prize && (
                      <span className="ml-2 text-xs font-medium text-amber-400">
                        {singleMatchResult.prize.name}
                      </span>
                    )}
                  </div>
                );
              })}

              <div className="flex justify-between items-center text-xs pt-2 border-t border-gray-700">
                <div className="flex gap-2">
                  <span className="text-gray-400">{record.multiples}倍</span>
                  {record.isAppend && <span className="text-amber-400">追加</span>}
                  {record.issues > 1 && (
                    <span className="text-blue-400">多期</span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-gray-400">¥{displayAmount.toFixed(2)}</span>
                  {record.wonAmount && (
                    <p className="text-green-400 font-medium">
                      +¥{formatMoney(record.wonAmount / record.issues)}
                    </p>
                  )}
                  {totalPrize && !record.wonAmount && (
                    <p className="text-amber-400 font-medium">
                      {(matchResults[record.id] || []).filter(r => r.prize).length}注中奖
                    </p>
                  )}
                </div>
              </div>
            </Card>
          );
        })
      )}
      </div>

      {/* 删除确认弹窗 */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setConfirmDeleteId(null)} />
          <div className="relative bg-gray-800 border border-gray-700 rounded-xl p-5 mx-4 max-w-xs w-full shadow-xl">
            <h3 className="text-base font-semibold mb-2">确认删除</h3>
            <p className="text-sm text-gray-400 mb-4">确定要删除这条购彩记录吗？此操作不可撤销。</p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="md"
                className="flex-1 text-sm"
                onClick={() => setConfirmDeleteId(null)}
              >
                取消
              </Button>
              <Button
                size="md"
                className="flex-1 text-sm !bg-red-500 hover:!bg-red-600 !text-white"
                onClick={() => {
                  deleteRecord(confirmDeleteId);
                  setConfirmDeleteId(null);
                }}
              >
                确定删除
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
