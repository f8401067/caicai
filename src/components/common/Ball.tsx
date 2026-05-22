import React from 'react';

/** Ball 组件属性 */
interface BallProps {
  number: number;           // 号码数字
  type: 'red' | 'blue' | 'gray'; // 球类型（红色/蓝色/灰色）
  matched?: boolean;        // 是否高亮匹配
  size?: 'xs' | 'sm' | 'md' | 'lg'; // 尺寸
  className?: string;       // 额外样式类
}

/**
 * 彩票号码球组件
 * 用于展示红球、蓝球号码，支持选中态/未选中态样式切换
 */
export const Ball: React.FC<BallProps> = ({
  number,
  type,
  matched = false,
  size = 'md',
  className = ''
}) => {
  // 各尺寸对应的 CSS 类
  const sizeClasses = {
    xs: 'w-5 h-5 text-xs',
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base'
  };

  // 基础圆形容器样式
  const baseClasses = `
    flex items-center justify-center rounded-full font-bold
    transition-all duration-200
  `;

  // 不同球类型的颜色样式（matched 控制是否高亮）
  const typeClasses = {
    red: matched
      ? 'bg-red-500 text-white'
      : 'bg-gray-700 text-gray-400',
    blue: matched
      ? 'bg-blue-500 text-white'
      : 'bg-gray-700 text-gray-400',
    gray: matched
      ? 'bg-gray-500 text-white'
      : 'bg-gray-700 text-gray-400'
  };

  return (
    <div
      className={`
        ${baseClasses}
        ${sizeClasses[size]}
        ${typeClasses[type]}
        ${className}
      `}
    >
      {String(number).padStart(2, '0')}
    </div>
  );
};
