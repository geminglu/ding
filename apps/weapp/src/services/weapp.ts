import Taro from "@tarojs/taro";

const API_BASE_URL = "http://127.0.0.1:3000".replace(/\/$/, "");
const DEMO_TITLE = "测试标题";
const DEMO_CONTENT = "测试内容";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  statusCode?: number;
}

export interface WeappProfile {
  userId: string;
  openidMasked: string;
  key: string;
  templateId: string;
  notifyGetExample: string;
  notifyPostExample: string;
  notices: string[];
}

export const buildNotifyGetExample = (key: string) =>
  `${API_BASE_URL}/api/v1/notify/${key}?title=${encodeURIComponent(DEMO_TITLE)}&content=${encodeURIComponent(DEMO_CONTENT)}`;

export const buildNotifyPostExample = (key: string) =>
  `${API_BASE_URL}/api/v1/notify/${key}`;

export const buildNotifyCurlExample = (key: string) =>
  `curl -X POST ${buildNotifyPostExample(key)} -H "Content-Type: application/json" -d '{"title":"${DEMO_TITLE}","content":"${DEMO_CONTENT}"}'`;

export const buildSharePagePath = (key: string) =>
  `/pages/share/index?key=${encodeURIComponent(key)}`;

const requestData = async <T>(
  path: string,
  method: "GET" | "POST",
  data?: Record<string, unknown>,
) => {
  const response = await Taro.request<ApiResponse<T>>({
    url: `${API_BASE_URL}${path}`,
    method,
    data,
  });

  const payload = response.data;
  if (response.statusCode >= 400 || !payload?.success) {
    throw new Error(payload?.message || "请求失败，请稍后重试");
  }

  return payload.data;
};

export const registerOrLogin = async (code: string) =>
  requestData<WeappProfile>("/api/v1/weapp/auth/register-or-login", "POST", {
    code,
  });

export const rotateKey = async (code: string) =>
  requestData<WeappProfile>("/api/v1/weapp/key/rotate", "POST", { code });
