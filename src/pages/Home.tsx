import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, Settings, RefreshCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { LotteryType, LOTTERY_CONFIGS, DrawResult } from '../types';
import { parseDrawNumbers, formatMoney } from '../utils/lottery';
import { fetchLotteryRegions } from '../utils/lotteryDetail';
import { Ball } from '../components/common/Ball';
import { Card } from '../components/common/Card';
import { API_CONFIG } from '../utils/apiConfig';

/** 开奖API密钥和配置 */
const API_KEY = '1bca7536f3b29cc79f73a87730e712b7';
const PAGE_SIZE = 30;
const API_BASE_URL = API_CONFIG.lottery.baseUrl;

/** 已拉取的期号记录（用于去重） */
const fetchedIssues: Record<string, Set<string>> = {};

/**
 * 首页：开奖结果展示
 * 显示各彩种的历史开奖结果，支持懒加载和刷新
 */
export default function Home() {
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const observerRef = useRef<HTMLDivElement>(null);
  
  const {
    currentType,
    setCurrentType,
    enabledTypes,
    toggleLotteryType,
    drawHistory,
    addDrawHistory,
    setDrawResult
  } = useAppStore();

  const config = LOTTERY_CONFIGS[currentType];
  const history = drawHistory[currentType] || [];
  const displayHistory = history.slice(0, displayCount);
  const hasMore = history.length > displayCount;

  /**
   * 从API获取开奖历史数据
   * @param page 页码
   * @param forceRefresh 是否强制刷新（忽略已有缓存）
   */
  const fetchHistory = async (page: number = 1, forceRefresh: boolean = false) => {
    // 初始化期号记录
    if (!fetchedIssues[currentType]) {
      fetchedIssues[currentType] = new Set(history.map(r => r.issueno));
    }

    // 检查是否已有数据且不需要强制刷新
    if (!forceRefresh && history.length > 0) {
      return;
    }

    const config = LOTTERY_CONFIGS[currentType];
    try {
      const url = `${API_BASE_URL}/api/caipiao/v1/history?key=${API_KEY}&caipiaoid=${config.caipiaoid}&page=${page}&pagesize=${PAGE_SIZE}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      // 探索数据结构并正确提取列表
      let listData: DrawResult[] = [];
      
      // 检查 data.data 的结构
      if (data.data) {
        if (Array.isArray(data.data)) {
          // data.data 直接是数组
          listData = data.data;
        } else if (typeof data.data === 'object') {
          // data.data 是对象，检查它的属性
          
          // 尝试找到可能的数组属性
          if (data.data.list && Array.isArray(data.data.list)) {
            listData = data.data.list;
          } else if (data.data.data && Array.isArray(data.data.data)) {
            listData = data.data.data;
          } else if (data.data.result && Array.isArray(data.data.result)) {
            listData = data.data.result;
          } else if (data.data.items && Array.isArray(data.data.items)) {
            listData = data.data.items;
          } else {
            // 直接检查 data.data 本身是否有数据
            const hasDataKeys = Object.keys(data.data).some(key => 
              key === 'list' || key === 'data' || key === 'result' || key === 'items'
            );
            if (!hasDataKeys) {
              // 如果没有这些属性，尝试检查是否直接就是开奖数据
              if (data.data.issueno) {
                // 单条数据的情况
                listData = [data.data];
              }
            }
          }
        }
      } else if (data.list && Array.isArray(data.list)) {
        listData = data.list;
      }
      
      if (listData.length === 0) {
        return;
      }
        
      if (page === 1) {
        // 去重合并：保留所有已有的数据，只添加新的期数
        const existingIssues = new Set(history.map(r => r.issueno));
        const newData = listData.filter((r: DrawResult) => !existingIssues.has(r.issueno));
        
        if (newData.length > 0 || forceRefresh) {
          // 更新期号记录
          listData.forEach((r: DrawResult) => {
            fetchedIssues[currentType]?.add(r.issueno);
          });
          
          // 获取最新一期的中奖地区信息
          if (listData[0]) {
            try {
              listData[0].prize = await fetchLotteryRegions(
                currentType,
                listData[0].issueno,
                listData[0].prize
              );
            } catch (e) {
              console.error('获取中奖地区信息失败:', e);
            }
          }
          
          // 如果是强制刷新，保留所有数据，把新数据放在前面
          const mergedData = [...listData];
          history.forEach(r => {
            if (!mergedData.some(m => m.issueno === r.issueno)) {
              mergedData.push(r);
            }
          });
          
          addDrawHistory(currentType, mergedData);
          if (listData[0]) {
            setDrawResult(currentType, listData[0]);
          }
        }
      } else {
        // 加载更多数据时
        const existingIssues = new Set(history.map(r => r.issueno));
        const newData = listData.filter((r: DrawResult) => !existingIssues.has(r.issueno));
        
        if (newData.length > 0) {
          newData.forEach((r: DrawResult) => {
            fetchedIssues[currentType]?.add(r.issueno);
          });
          addDrawHistory(currentType, [...history, ...newData]);
        }
      }
    } catch (error) {
      // 静默失败
    }
  };

  useEffect(() => {
    fetchHistory(1);
  }, [currentType]);

  const handleRefresh = () => {
    setLoading(true);
    setDisplayCount(PAGE_SIZE);
    fetchHistory(1, true).finally(() => setLoading(false));
  };

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    
    // 计算需要加载的页数
    const currentPage = Math.ceil(history.length / PAGE_SIZE) + 1;
    await fetchHistory(currentPage);
    
    setDisplayCount(prev => Math.min(prev + PAGE_SIZE, history.length + PAGE_SIZE));
    setLoadingMore(false);
  }, [loadingMore, hasMore, history.length, currentType]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          handleLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loadingMore, handleLoadMore]);

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800 px-2 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowSettings(true)}
              className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
            <h1 className="text-base font-bold">彩彩</h1>
          </div>
          
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => navigate('/scan')}
              className="p-1.5 bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors"
            >
              <Camera className="w-4 h-4 text-black" />
            </button>
          </div>
        </div>

        <div className="flex gap-1 mt-1.5 overflow-x-auto pb-0.5">
          {enabledTypes.map((type) => (
            <button
              key={type}
              onClick={() => setCurrentType(type)}
              className={`px-2.5 py-1 rounded-lg whitespace-nowrap text-xs transition-colors ${
                currentType === type
                  ? 'bg-amber-500 text-black font-semibold'
                  : 'bg-gray-700 text-white hover:bg-gray-600'
              }`}
            >
              {LOTTERY_CONFIGS[type].name}
            </button>
          ))}
        </div>
      </div>

      <div className="pb-16">
        {displayHistory.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <RefreshCcw className="w-8 h-8 mx-auto mb-2 animate-spin" />
            <p className="text-sm">加载中...</p>
          </div>
        ) : (
          <>
            {displayHistory.map((result, index) => {
              const numbers = parseDrawNumbers(result);
              const isLatest = index === 0;
              
              return (
                <div key={result.issueno} className="px-2 py-1.5">
                  <Card className={`p-2.5 ${isLatest ? 'border-amber-500/30' : ''}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-gray-300">
                          第{result.issueno}期
                        </span>
                        {isLatest && (
                          <span className="text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">
                            最新
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">
                        {result.opendate}
                      </span>
                    </div>

                    <div className="flex gap-1.5 flex-wrap items-center justify-center py-1.5">
                      {numbers.red.map((num, i) => (
                        <Ball key={`red-${i}`} number={num} type="red" size="md" matched={true} />
                      ))}
                      {numbers.blue.length > 0 && (
                        <div className="w-px h-4 bg-gray-600 mx-0.5" />
                      )}
                      {numbers.blue.map((num, i) => (
                        <Ball key={`blue-${i}`} number={num} type="blue" size="md" matched={true} />
                      ))}
                    </div>

                    {result.totalmoney && (
                      <div className="mt-1.5 pt-1.5 border-t border-gray-700 space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex gap-3">
                            <div className="text-center">
                              <p className="text-xs text-gray-400">奖池</p>
                              <p className="text-xs font-bold text-amber-500">
                                {formatMoney(result.totalmoney)}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-gray-400">销量</p>
                              <p className="text-xs font-bold text-blue-400">
                                {result.saleamount ? formatMoney(result.saleamount) : '-'}
                              </p>
                            </div>
                          </div>
                          {result.prize && result.prize[0] && (
                            <div className="text-right">
                              <p className="text-xs text-gray-400">{result.prize[0].name}</p>
                              <p className="text-xs font-bold text-green-400">
                                {result.prize[0].num > 0 
                                  ? `${result.prize[0].num}注 · ￥${formatMoney(result.prize[0].singlebonus)}/注`
                                  : '无人中奖'
                                }
                              </p>
                            </div>
                          )}
                        </div>
                        
                        {/* 中奖地区信息 */}
                        {isLatest && result.prize && (
                          <div className="space-y-1">
                            {result.prize.slice(0, 2).map((prize, idx) => (
                              prize.regions && prize.regions.length > 0 && (
                                <div key={idx} className="text-xs">
                                  <span className="text-gray-400">{prize.name}：</span>
                                  <span className="text-amber-400">
                                    {prize.regions.map(region => 
                                      region.city 
                                        ? `${region.city}（${region.province}）` 
                                        : region.province
                                    ).join('、')}
                                  </span>
                                </div>
                              )
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                </div>
              );
            })}

            <div ref={observerRef} className="p-2">
              {loadingMore && (
                <div className="text-center py-4 text-gray-400 text-xs">
                  加载更多...
                </div>
              )}
              {!hasMore && displayHistory.length > 0 && (
                <div className="text-center py-4 text-gray-500 text-xs">
                  已加载全部 {displayHistory.length} 期
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
          <div className="bg-gray-800 rounded-t-2xl w-full max-w-md p-2.5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold">选择彩种</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1 hover:bg-gray-700 rounded-lg text-xs"
              >
                ✕
              </button>
            </div>
            <div className="space-y-1">
              {Object.values(LOTTERY_CONFIGS).map((config) => (
                <label
                  key={config.type}
                  className="flex items-center justify-between p-2 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600"
                >
                  <span className="text-xs">{config.name}</span>
                  <input
                    type="checkbox"
                    checked={enabledTypes.includes(config.type)}
                    onChange={() => toggleLotteryType(config.type)}
                    className="w-3.5 h-3.5 accent-amber-500"
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
