import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Card 卡片容器组件属性 */
interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

/**
 * 卡片容器组件
 * 深色背景圆角卡片，支持点击交互和自定义样式
 */
export const Card: React.FC<CardProps> = ({ children, className, onClick }) => {
  return (
    <div
      className={cn(
        'bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-700',
        onClick && 'cursor-pointer hover:bg-gray-750 hover:border-gray-600 transition-colors',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
};
