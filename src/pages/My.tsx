import React from 'react';
import { History, TrendingUp, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Card } from '../components/common/Card';
import { formatMoney } from '../utils/lottery';

export default function My() {
  const navigate = useNavigate();
  const { records, verifyRecords } = useAppStore();

  // 计算总花费（只算真实购票）
  const totalSpent = records
    .filter(r => r.isReal)
    .reduce((sum, r) => sum + r.amount, 0);

  // 计算总中奖
  const totalWon = records
    .filter(r => r.isReal && r.wonAmount)
    .reduce((sum, r) => sum + (r.wonAmount || 0), 0) +
    verifyRecords
      .reduce((sum, r) => {
        const betsWon = (r.bets || []).reduce((bs, b) => bs + (b.wonAmount || 0), 0);
        return sum + betsWon;
      }, 0);

  // 验证历史记录数
  const historyCount = verifyRecords.length;

  const menuItems = [
    {
      icon: History,
      label: '验证历史',
      description: `共${historyCount}条记录`,
      path: '/my/history'
    },
    {
      icon: TrendingUp,
      label: '消费统计',
      description: '查看购彩支出',
      path: '/my/stats'
    }
  ];

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800 px-2 py-2">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">我的</h1>
        </div>
      </div>

      <div className="p-2 space-y-2">
        <Card className="p-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center py-2 border-b border-r border-gray-700">
              <p className="text-gray-400 text-xs mb-1">总花费</p>
              <p className="text-base font-bold text-red-400">
                ¥{formatMoney(totalSpent)}
              </p>
            </div>
            <div className="text-center py-2 border-b border-gray-700">
              <p className="text-gray-400 text-xs mb-1">总中奖</p>
              <p className="text-base font-bold text-green-400">
                ¥{formatMoney(totalWon)}
              </p>
            </div>
            <div className="text-center py-2 border-r border-gray-700">
              <p className="text-gray-400 text-xs mb-1">购彩记录</p>
              <p className="text-base font-bold">{records.length}</p>
            </div>
            <div className="text-center py-2">
              <p className="text-gray-400 text-xs mb-1">验证记录</p>
              <p className="text-base font-bold">{verifyRecords.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-0 overflow-hidden">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="w-full flex items-center justify-between p-2.5 border-b border-gray-700 last:border-0 hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center">
                    <Icon className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-medium">{item.label}</p>
                    <p className="text-xs text-gray-400">{item.description}</p>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
              </button>
            );
          })}
        </Card>

        <Card className="p-3">
          <div className="text-center py-2">
            <p className="text-gray-400 text-xs mb-1">盈亏</p>
            <p className={`text-lg font-bold ${totalWon >= totalSpent ? 'text-green-400' : 'text-red-400'}`}>
              {totalWon >= totalSpent ? '+' : ''}
              ¥{formatMoney(totalWon - totalSpent)}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
