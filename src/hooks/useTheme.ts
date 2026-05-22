import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

/**
 * 主题管理 Hook
 * - 支持亮色/暗色模式切换
 * - 从 localStorage 恢复上次主题选择
 * - 未设置时跟随系统偏好
 * - 将主题 class 应用到 <html> 元素
 */
export function useTheme() {
  // 初始化主题：优先从 localStorage 读取，其次跟随系统偏好
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
      return savedTheme;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // 主题变化时更新 DOM 和 localStorage
  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // 切换亮/暗主题
  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  return {
    theme,        // 当前主题
    toggleTheme,  // 切换主题函数
    isDark: theme === 'dark' // 是否为暗色主题
  };
} 