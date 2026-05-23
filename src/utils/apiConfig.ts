/**
 * API 配置
 * 支持开发环境（Vite 代理）和生产环境（直接请求）
 */

// 开发环境使用代理，生产环境直接请求
const isDev = import.meta.env.DEV

export const API_CONFIG = {
  // 彩票数据 API
  lottery: {
    baseUrl: isDev ? '/api' : 'https://api2.tanshuapi.com',
  },
  // 百度 OCR API
  baiduOcr: {
    oauthUrl: isDev ? '/baidu-oauth' : 'https://aip.baidubce.com',
    apiUrl: isDev ? '/baidu-ocr' : 'https://aip.baidubce.com',
  },
  // 体彩官网
  lotteryGov: {
    baseUrl: isDev ? '/lottery-gov' : 'https://www.lottery.gov.cn',
  },
  // 福彩官网
  cwlGov: {
    baseUrl: isDev ? '/cwl-gov' : 'https://www.cwl.gov.cn',
  },
}
