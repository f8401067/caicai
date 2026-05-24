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
  const [filter, setFilter] = useState<FilterType>('all');
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

  /** 匹配结果缓存 - 结构为 [periodIndex][betIndex] */
  const [matchResults, setMatchResults] = useState<Record<string, MatchResult[][]>>({});

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
    const newMatchResults: Record<string, MatchResult[][]> = {};
    let hasUpdates = false;

    records.forEach(record => {
      const allBets = record.bets || [{ numbers: record.numbers }];
      const recordMatchResults: MatchResult[][] = [];
      
      // 处理多期
      for (let periodIdx = 0; periodIdx < record.issues; periodIdx++) {
        const periodBetsResults: MatchResult[] = [];
        
        // 计算当前期号
        const baseIssue = parseInt(record.issue, 10);
        const targetIssue = String(baseIssue + periodIdx);
        
        // 查找当前期的开奖结果
        const history = drawHistory[record.type] || [];
        const drawResult = history.find(r => r.issueno === targetIssue);
        
        // 对每注进行匹配
        allBets.forEach((bet, betIndex) => {
          if (drawResult) {
            // 找到了对应的开奖记录，进行匹配
            const matchResult = matchNumbers(record.type, bet.numbers, drawResult);
            periodBetsResults.push(matchResult);
          } else if (matchResults[record.id] && matchResults[record.id][periodIdx] && matchResults[record.id][periodIdx][betIndex]) {
            // 使用已有的匹配结果
            periodBetsResults.push(matchResults[record.id][periodIdx][betIndex]);
          }
        });
        
        recordMatchResults.push(periodBetsResults);
      }

      newMatchResults[record.id] = recordMatchResults;
      
      // 更新记录状态
      if (record.status === 'pending') {
        const hasDrawResult = recordMatchResults.some(period => period.some(match => match !== null));
        if (hasDrawResult) {
          hasUpdates = true;
          
          // 计算总中奖金额
          let totalWonAmount = 0;
          recordMatchResults.forEach(period => {
            period.forEach(match => {
              if (match?.prize) {
                totalWonAmount += match.prize.bonus * record.multiples;
              }
            });
          });
          
          updateRecord(record.id, {
            status: totalWonAmount > 0 ? 'won' : 'not_won',
            wonAmount: totalWonAmount > 0 ? totalWonAmount : undefined
          });
        }
      }
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

  const getMatchResult = (record: LotteryRecord, periodIndex: number, betIndex: number): MatchResult | null => {
    const periods = matchResults[record.id];
    if (!periods || !periods[periodIndex]) return null;
    return periods[periodIndex][betIndex] || null;
  };

  const getTotalPrize = (record: LotteryRecord) => {
    const periods = matchResults[record.id];
    if (!periods || periods.length === 0) return null;
    
    let wonAmount = 0;
    periods.forEach(period => {
      period.forEach(result => {
        if (result?.prize) {
          wonAmount += result.prize.bonus * record.multiples;
        }
      });
    });
    
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
          // 获取第一注的匹配结果来显示开奖号码（因为同一期所有注的开奖号码相同）
          const firstBetMatchResult = getMatchResult(record, periodIndex, 0);
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
                const singleMatchResult = getMatchResult(record, periodIndex, betIdx);
                const isMatched = singleMatchResult !== null;
                
                return (
                  <div key={betIdx} className={`py-1.5 ${betIdx > 0 ? 'border-t border-gray-700/50' : ''}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">第{betIdx + 1}注</span>
                      
                      {/* 显示中奖等级和奖金 */}
                      {isMatched && singleMatchResult?.prize && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-medium text-amber-400">
                            {singleMatchResult.prize.name}
                          </span>
                          <span className="text-xs font-bold text-green-400">
                            +¥{(singleMatchResult.prize.bonus * record.multiples).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-1.5 flex-wrap items-center justify-center">
                      {/* 红球 */}
                      {isMatched ? (
                        <>
                          {bet.numbers.red.map((num) => (
                            <Ball 
                              key={`r-${betIdx}-${num}`} 
                              number={num} 
                              type="red" 
                              size="md" 
                              matched={singleMatchResult.matchedRed.includes(num)} 
                            />
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
                      {bet.numbers.blue.length > 0 ? (
                        isMatched ? (
                          <>
                            {bet.numbers.blue.map((num) => (
                              <Ball 
                                key={`b-${betIdx}-${num}`} 
                                number={num} 
                                type="blue" 
                                size="md" 
                                matched={singleMatchResult.matchedBlue.includes(num)} 
                              />
                            ))}
                          </>
                        ) : (
                          bet.numbers.blue.map((num, i) => (
                            <Ball key={`b-${betIdx}-${i}`} number={num} type="blue" size="md" matched={true} />
                          ))
                        )
                      ) : null}
                    </div>
                  </div>
                );
              })}

              {/* 显示开奖号码（仅已开奖） */}
              {firstBetMatchResult && (
                <div className="pt-2 mt-2 border-t border-gray-700">
                  <p className="text-xs text-gray-400 mb-1.5 text-center">开奖号码</p>
                  <div className="flex gap-1.5 flex-wrap items-center justify-center">
                    {parseDrawNumbers(firstBetMatchResult.drawResult).red.map((num, i) => (
                      <Ball key={`dr-${i}`} number={num} type="red" size="md" matched={true} />
                    ))}
                    {parseDrawNumbers(firstBetMatchResult.drawResult).blue.length > 0 && (
                      <div className="w-px h-4 bg-gray-600 mx-0.5" />
                    )}
                    {parseDrawNumbers(firstBetMatchResult.drawResult).blue.map((num, i) => (
                      <Ball key={`db-${i}`} number={num} type="blue" size="md" matched={true} />
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center text-xs pt-2 mt-2 border-t border-gray-700">
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
