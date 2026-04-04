import Taro from "@tarojs/taro";

const STORAGE_KEY = "local_notify_history";
const MAX_HISTORY_COUNT = 20;

export interface NotifyHistoryItem {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

type RouterParams = Record<string, string | undefined>;

const decodeValue = (value?: string) => {
  if (!value) {
    return "";
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export const getLocalNotifyHistory = () => {
  return (Taro.getStorageSync(STORAGE_KEY) as NotifyHistoryItem[]) || [];
};

export const appendLocalNotifyHistory = (item: NotifyHistoryItem) => {
  const list = getLocalNotifyHistory();
  if (list.some((entry) => entry.id === item.id)) {
    return list;
  }

  const next = [item, ...list].slice(0, MAX_HISTORY_COUNT);
  Taro.setStorageSync(STORAGE_KEY, next);
  return next;
};

export const recordNotificationFromParams = (params: RouterParams) => {
  const title = decodeValue(params.title);
  const content = decodeValue(params.content);

  if (!title || !content) {
    return false;
  }

  const id = decodeValue(params.ts) || `${title}-${content}`;
  appendLocalNotifyHistory({
    id,
    title,
    content,
    createdAt: new Date().toISOString(),
  });
  return true;
};
