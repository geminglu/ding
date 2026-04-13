import { appConfig } from "@/constants/app-config";
import Toast from "react-native-toast-message";

type HttpMethod = "GET" | "POST";

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  query?: Record<string, string | number | undefined | null>;
}

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

const buildUrl = (
  path: string,
  query?: Record<string, string | number | undefined | null>,
) => {
  const baseUrl = appConfig.apiBaseUrl.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${baseUrl}${normalizedPath}`);

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    url.searchParams.set(key, String(value));
  });

  return url.toString();
};

export async function apiRequest<T>(
  path: string,
  { method = "GET", body, query }: RequestOptions = {},
): Promise<T> {
  const response = await fetch(buildUrl(path, query), {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const payload = (await response.json()) as ApiEnvelope<T>;

  console.log(payload);

  if (!response.ok || !payload.success) {
    Toast.show({
      type: "error",
      text1: "请求失败",
      text2: payload.message || "请求失败",
    });
    throw new Error(payload.message || "请求失败");
  }

  return payload.data;
}
