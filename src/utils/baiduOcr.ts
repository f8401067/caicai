export interface BaiduOcrConfig {
  apiKey: string;
  secretKey: string;
}

export interface BaiduOcrResult {
  words_result: { words: string }[];
  words_result_num: number;
  log_id: number;
  error_code?: number;
  error_msg?: string;
}

// 缓存 token
let cachedToken: string | null = null;
let tokenExpireTime: number = 0;

async function getAccessToken(config: BaiduOcrConfig): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < tokenExpireTime) {
    return cachedToken;
  }

  const url = `/baidu-oauth/oauth/2.0/token?grant_type=client_credentials&client_id=${config.apiKey}&client_secret=${config.secretKey}`;
  const res = await fetch(url, { method: 'POST' });
  const data = await res.json();

  if (data.error) {
    throw new Error(`获取Access Token失败: ${data.error_description}`);
  }

  cachedToken = data.access_token;
  tokenExpireTime = now + (data.expires_in - 300) * 1000; // 提前5分钟过期
  return cachedToken;
}

export async function baiduOcrRecognize(
  imageBase64: string,
  config: BaiduOcrConfig
): Promise<string> {
  const token = await getAccessToken(config);
  const url = `/baidu-ocr/rest/2.0/ocr/v1/general_basic?access_token=${token}`;

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
