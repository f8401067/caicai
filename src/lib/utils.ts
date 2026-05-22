import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * 合并 Tailwind CSS 类名，自动处理冲突样式
 * 将 clsx 的条件类名功能与 tailwind-merge 的样式合并功能结合
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
