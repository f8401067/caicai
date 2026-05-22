import React from 'react';

interface BallProps {
  number: number;
  type: 'red' | 'blue' | 'gray';
  matched?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export const Ball: React.FC<BallProps> = ({
  number,
  type,
  matched = false,
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    xs: 'w-5 h-5 text-xs',
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base'
  };

  const baseClasses = `
    flex items-center justify-center rounded-full font-bold
    transition-all duration-200
  `;

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
