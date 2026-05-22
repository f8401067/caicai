import React from 'react';
import { Trophy, History, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const tabs = [
  { path: '/', icon: Trophy, label: '开奖' },
  { path: '/records', icon: History, label: '购彩记录' },
  { path: '/my', icon: User, label: '我的' }
];

export const TabBar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 pb-safe">
      <div className="flex justify-around py-2">
        {tabs.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                'flex flex-col items-center gap-1 py-2 px-4 rounded-lg transition-all',
                isActive ? 'text-amber-500' : 'text-gray-400 hover:text-gray-300'
              )}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
