import React, { useState } from 'react';
import { ChevronLeft, Trophy, Calendar, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { LOTTERY_CONFIGS } from '../types';
import { formatDateTime } from '../utils/lottery';
import { Ball } from '../components/common/Ball';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';

export default function History() {
  const navigate = useNavigate();
  const { verifyRecords, clearVerifyRecords } = useAppStore();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800 px-3 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 hover:bg-gray-800 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold">验证历史</h1>
          </div>
          {verifyRecords.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="p-1.5 hover:bg-gray-800 rounded-lg text-red-400"
              title="清空记录"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="p-3 space-y-2">
        {verifyRecords.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <Calendar className="w-10 h-10 mx-auto mb-3 text-gray-600" />
            <p className="text-sm">暂无验证记录</p>
          </div>
        ) : (
          verifyRecords.map((record) => {
            const config = LOTTERY_CONFIGS[record.type];
            
            const totalWonAmount = record.bets?.reduce((sum, b) => sum + (b.wonAmount || 0), 0) || record.wonAmount || 0;
            const hasWin = record.bets?.some(b => b.prize) || !!record.prize;
            
            return (
              <Card key={record.id} className="p-3">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm">{config.name}</span>
                      {hasWin && (
                        <span className="text-xs bg-green-500 px-1.5 py-0.5 rounded-full">
                          中奖
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDateTime(record.createdAt)}
                    </p>
                  </div>
                  {hasWin && totalWonAmount > 0 && (
                    <div className="text-right">
                      <p className="text-amber-500 font-bold">
                        ¥{totalWonAmount.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

                {/* 显示所有注 */}
                {(record.bets?.length > 0 ? record.bets : [{ numbers: record.numbers, matched: record.matched, prize: record.prize, wonAmount: record.wonAmount }]).map((bet, betIdx) => (
                  <div key={betIdx} className={`flex gap-1.5 flex-wrap items-center justify-center py-1.5 ${betIdx > 0 ? 'border-t border-gray-700/50' : ''}`}>
                    <span className="text-xs text-gray-500 mr-1 w-8 text-right">第{betIdx + 1}注</span>
                    {bet.numbers.red.map((num, i) => (
                      <Ball
                        key={`r-${betIdx}-${i}`}
                        number={num}
                        type="red"
                        size="md"
                        matched={bet.matched.red.includes(num)}
                      />
                    ))}
                    {bet.numbers.blue.length > 0 && (
                      <div className="w-px h-4 bg-gray-600 mx-0.5" />
                    )}
                    {bet.numbers.blue.map((num, i) => (
                      <Ball
                        key={`b-${betIdx}-${i}`}
                        number={num}
                        type="blue"
                        size="md"
                        matched={bet.matched.blue.includes(num)}
                      />
                    ))}
                    {bet.prize && (
                      <span className="text-xs text-green-400 ml-1">{bet.prize} ¥{bet.wonAmount?.toLocaleString()}</span>
                    )}
                  </div>
                ))}

                {record.drawResult && (
                  <div className="pt-2 border-t border-gray-700">
                    <p className="text-xs text-gray-400 mb-1.5">开奖号码</p>
                    <div className="flex gap-1.5 flex-wrap items-center justify-center">
                      {record.drawResult.red.map((num, i) => (
                        <Ball key={`draw-red-${i}`} number={num} type="red" size="md" matched={true} />
                      ))}
                      {record.drawResult.blue.length > 0 && (
                        <div className="w-px h-4 bg-gray-600 mx-0.5" />
                      )}
                      {record.drawResult.blue.map((num, i) => (
                        <Ball key={`draw-blue-${i}`} number={num} type="blue" size="md" matched={true} />
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* 清空确认弹窗 */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowClearConfirm(false)} />
          <div className="relative bg-gray-800 border border-gray-700 rounded-xl p-5 mx-4 max-w-xs w-full shadow-xl">
            <h3 className="text-base font-semibold mb-2">确认清空</h3>
            <p className="text-sm text-gray-400 mb-4">确定要清空所有验奖记录吗？此操作不可撤销。</p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="md"
                className="flex-1 text-sm"
                onClick={() => setShowClearConfirm(false)}
              >
                取消
              </Button>
              <Button
                size="md"
                className="flex-1 text-sm !bg-red-500 hover:!bg-red-600 !text-white"
                onClick={() => {
                  clearVerifyRecords();
                  setShowClearConfirm(false);
                }}
              >
                确定清空
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
