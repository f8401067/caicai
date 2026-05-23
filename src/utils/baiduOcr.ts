import { API_CONFIG } from './apiConfig';

/** 百度 OCR API 配置参数 */
export interface BaiduOcrConfig {
  apiKey: string;
  secretKey: string;
}

/** 百度 OCR API 响应数据结构 */
export interface BaiduOcrResult {
  words_result: { words: string }[];  // 识别出的文字列表
  words_result_num: number;           // 识别出的文字数量
  log_id: number;                     // 请求日志ID
  error_code?: number;                // 错误码
  error_msg?: string;                 // 错误信息
}

// Access Token 缓存（避免每次请求都重新获取）
let cachedToken: string | null = null;
let tokenExpireTime: number = 0;

/**
 * 获取百度 OCR 的 Access Token
 * 使用缓存机制，在过期前5分钟自动刷新
 */
async function getAccessToken(config: BaiduOcrConfig): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < tokenExpireTime) {
    return cachedToken;
  }

  const url = `${API_CONFIG.baiduOcr.oauthUrl}/oauth/2.0/token?grant_type=client_credentials&client_id=${config.apiKey}&client_secret=${config.secretKey}`;
  const res = await fetch(url, { method: 'POST' });
  const data = await res.json();

  if (data.error) {
    throw new Error(`获取Access Token失败: ${data.error_description}`);
  }

  cachedToken = data.access_token;
  tokenExpireTime = now + (data.expires_in - 300) * 1000; // 提前5分钟过期
  return cachedToken;
}

/**
 * 调用百度通用文字识别 API
 * @param imageBase64 图片的 Base64 编码（不含 data URL 前缀）
 * @param config 百度 API 密钥配置
 * @returns 识别结果文本（每行一条）
 */
export async function baiduOcrRecognize(
  imageBase64: string,
  config: BaiduOcrConfig
): Promise<string> {
  const token = await getAccessToken(config);
  const url = `${API_CONFIG.baiduOcr.apiUrl}/rest/2.0/ocr/v1/general_basic?access_token=${token}`;

  const formData = new URLSearchParams();
  formData.append('image', imageBase64);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData,
  });

  const data: BaiduOcrResult = await res.json();
  if (data.error_code) {
    throw new Error(`百度OCR识别失败: ${data.error_msg}`);
  }

  return data.words_result.map(w => w.words).join('\n');
}

/**
 * 将 File 对象转为 Base64 字符串
 * 去掉 data URL 前缀（如 "data:image/png;base64,"），仅保留纯 Base64
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // 去掉 data:image/xxx;base64, 前缀
      resolve(result.split(',')[1] || result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export { fileToBase64 };
