import React, { useState, useMemo } from 'react';
import { ChevronLeft, Calendar, BarChart3, ChevronLeft as ChevronLeftIcon, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { formatMoney } from '../utils/lottery';
import { Card } from '../components/common/Card';

/** 统计周期类型 */
type Period = 'month' | 'year';

/**
 * 消费统计页面
 * 按月展示购彩花费、中奖和盈亏情况
 * 包含日历热力图，直观显示每日消费
 */
export default function Stats() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const { records, verifyRecords } = useAppStore();

  // 生成日历数据
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay(); // 0 = Sunday

    const days = [];
    
    // 填充前面的空白
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    // 填充日期
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      let spent = 0;
      
      records.forEach(r => {
        if (!r.isReal) return;
        const recordDate = new Date(r.createdAt);
        const recordDateStr = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}-${String(recordDate.getDate()).padStart(2, '0')}`;
        if (recordDateStr === dateStr) {
          spent += r.amount;
        }
      });
      
      verifyRecords.forEach(r => {
        if (!r.amount) return;
        const recordDate = new Date(r.createdAt);
        const recordDateStr = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}-${String(recordDate.getDate()).padStart(2, '0')}`;
        if (recordDateStr === dateStr) {
          spent += r.amount;
        }
      });

      days.push({ day, date: dateStr, spent });
    }

    return days;
  }, [currentDate, records, verifyRecords]);

  // 计算月度总额
  const monthlyData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    let totalSpent = 0;
    let totalWon = 0;
    
    records.forEach(r => {
      if (!r.isReal) return;
      const recordDate = new Date(r.createdAt);
      if (recordDate.getFullYear() === year && recordDate.getMonth() === month) {
        totalSpent += r.amount;
        totalWon += r.wonAmount || 0;
      }
    });
    
    verifyRecords.forEach(r => {
      const recordDate = new Date(r.createdAt);
      if (recordDate.getFullYear() === year && recordDate.getMonth() === month) {
        totalSpent += r.amount || 0;
        totalWon += r.wonAmount || 0;
      }
    });

    return { totalSpent, totalWon };
  }, [currentDate, records, verifyRecords]);

  // 获取颜色
  const getHeatColor = (amount: number) => {
    if (amount === 0) return 'bg-gray-800';
    if (amount < 10) return 'bg-amber-900';
    if (amount < 50) return 'bg-amber-700';
    if (amount < 100) return 'bg-amber-600';
    if (amount < 200) return 'bg-amber-500';
    return 'bg-amber-400';
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800 px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 hover:bg-gray-800 rounded-lg"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">消费统计</h1>
        </div>
      </div>

      <div className="p-3">
        <div className="grid grid-cols-2 gap-3">
          <Card className="text-center p-3">
            <p className="text-gray-400 text-xs mb-1">本月花费</p>
            <p className="text-lg font-bold text-red-400">
              ¥{formatMoney(monthlyData.totalSpent)}
            </p>
          </Card>
          <Card className="text-center p-3">
            <p className="text-gray-400 text-xs mb-1">本月中奖</p>
            <p className="text-lg font-bold text-green-400">
              ¥{formatMoney(monthlyData.totalWon)}
            </p>
          </Card>
        </div>
        <Card className="mt-3 text-center p-3">
          <p className="text-gray-400 text-xs mb-1">本月盈亏</p>
          <p className={`text-lg font-bold ${
            monthlyData.totalWon >= monthlyData.totalSpent ? 'text-green-400' : 'text-red-400'
          }`}>
            {monthlyData.totalWon >= monthlyData.totalSpent ? '+' : ''}
            ¥{formatMoney(monthlyData.totalWon - monthlyData.totalSpent)}
          </p>
        </Card>
      </div>

      <div className="px-3 mb-3">
        <Card className="p-2">
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-gray-700 rounded-lg"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
            <div className="text-center">
              <p className="text-base font-bold">
                {currentDate.getFullYear()}年{monthNames[currentDate.getMonth()]}
              </p>
            </div>
            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-gray-700 rounded-lg"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </Card>
      </div>

      <div className="px-3">
        <Card className="p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-amber-500" />
              <h3 className="font-semibold text-sm">每日消费</h3>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1.5 text-center text-xs text-gray-500">
            <div>日</div>
            <div>一</div>
            <div>二</div>
            <div>三</div>
            <div>四</div>
            <div>五</div>
            <div>六</div>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarData.map((day, index) => (
              <div key={index} className="aspect-square">
                {day ? (
                  <div
                    className={`
                      w-full h-full rounded flex flex-col items-center justify-center
                      ${getHeatColor(day.spent)}
                      ${day.spent > 0 ? 'cursor-pointer hover:opacity-80' : ''}
                    `}
                    title={day.spent > 0 ? `¥${day.spent.toFixed(2)}` : ''}
                  >
                    <span className="text-xs">{day.day}</span>
                    {day.spent > 0 && (
                      <span className="text-xs opacity-70">
                        {day.spent >= 100 ? `${(day.spent / 100).toFixed(1)}百` : day.spent}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-full" />
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-3 mt-3 text-xs text-gray-400">
            <span>少</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded bg-gray-800" />
              <div className="w-3 h-3 rounded bg-amber-900" />
              <div className="w-3 h-3 rounded bg-amber-700" />
              <div className="w-3 h-3 rounded bg-amber-500" />
              <div className="w-3 h-3 rounded bg-amber-400" />
            </div>
            <span>多</span>
          </div>
        </Card>
      </div>

      <div className="px-3 mt-3">
        <Card className="p-3">
          <h3 className="font-semibold text-sm mb-2">消费明细</h3>
          <div className="space-y-1.5">
            {[...records]
              .filter(r => r.isReal)
              .sort((a, b) => b.createdAt - a.createdAt)
              .slice(0, 10)
              .map(record => {
                const date = new Date(record.createdAt);
                return (
                  <div
                    key={record.id}
                    className="flex items-center justify-between py-1.5 border-b border-gray-700 last:border-0"
                  >
                    <div>
                      <p className="text-xs">{`${date.getMonth() + 1}月${date.getDate()}日`}</p>
                      <p className="text-xs text-gray-400">第{record.issue}期</p>
                    </div>
                    <span className="text-red-400 text-sm font-medium">
                      -¥{record.amount.toFixed(2)}
                    </span>
                  </div>
                );
              })}
          </div>
        </Card>
      </div>
    </div>
  );
}
