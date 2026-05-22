import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Button 组件属性 */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline'; // 样式变体
  size?: 'sm' | 'md' | 'lg';                    // 尺寸
}

/**
 * 通用按钮组件
 * 支持 primary（金色主色调）、secondary（灰色）、outline（边框）三种样式
 */
export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) => {
  // 各变体的样式映射
  const variantClasses = {
    primary: 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black hover:from-amber-600 hover:to-yellow-600',
    secondary: 'bg-gray-700 text-white hover:bg-gray-600',
    outline: 'bg-transparent border border-gray-600 text-white hover:bg-gray-700'
  };

  // 各尺寸的 padding 和字号
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  return (
    <button
      className={cn(
        'rounded-lg font-semibold transition-all duration-200',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};
