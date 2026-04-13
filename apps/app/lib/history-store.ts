import * as SQLite from 'expo-sqlite';

/**
 * 本地通知历史数据库文件名。
 *
 * 对应产品文档里的约束：
 * - 通知历史只保存在当前设备
 * - 不上云
 * - 用户可选择保留 7 天或 30 天
 */
const DB_NAME = 'ding-history.db';
const DEFAULT_RETENTION_DAYS = 7;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

type HistoryRow = {
  id: string;
  title: string;
  content: string;
  receivedAt: number;
  openedAt: number | null;
};

/**
 * 懒加载并初始化本地 SQLite 数据库。
 *
 * 这里除了通知历史表，还会创建一个轻量设置表，
 * 专门保存“保留 7 天 / 保留 30 天”这样的本地偏好。
 */
const getDb = async () => {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME);
  }

  const db = await dbPromise;

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS notification_history (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      payloadJson TEXT,
      receivedAt INTEGER NOT NULL,
      openedAt INTEGER
    );

    CREATE TABLE IF NOT EXISTS local_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);

  return db;
};

export type NotificationHistoryItem = {
  id: string;
  title: string;
  content: string;
  receivedAt: number;
  openedAt: number | null;
};

/**
 * 读取当前设备上配置的历史保留天数。
 */
export async function getRetentionDays() {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM local_settings WHERE key = ?',
    ['historyRetentionDays']
  );

  return row?.value ? Number(row.value) : DEFAULT_RETENTION_DAYS;
}

/**
 * 更新历史保留天数，并立即执行一次本地清理。
 */
export async function setRetentionDays(days: 7 | 30) {
  const db = await getDb();

  await db.runAsync(
    'INSERT OR REPLACE INTO local_settings (key, value) VALUES (?, ?)',
    ['historyRetentionDays', String(days)]
  );

  await cleanupExpiredHistory(days);
}

/**
 * 根据当前保留策略，删除过期的本地通知历史。
 */
export async function cleanupExpiredHistory(retentionDays?: number) {
  const db = await getDb();
  const days = retentionDays ?? (await getRetentionDays());
  const threshold = Date.now() - days * 24 * 60 * 60 * 1000;

  await db.runAsync('DELETE FROM notification_history WHERE receivedAt < ?', [
    threshold,
  ]);
}

/**
 * 保存一条通知历史到本地设备。
 *
 * 这部分对应产品文档里的“通知历史只保存在本地”。
 * 即使服务端不保存完整历史，用户仍然可以在当前设备上查看最近记录。
 */
export async function saveNotificationHistory(input: {
  id: string;
  title: string;
  content: string;
  payload?: Record<string, unknown>;
  receivedAt?: number;
  openedAt?: number | null;
}) {
  const db = await getDb();
  const receivedAt = input.receivedAt ?? Date.now();

  await db.runAsync(
    `INSERT OR REPLACE INTO notification_history
      (id, title, content, payloadJson, receivedAt, openedAt)
      VALUES (?, ?, ?, ?, ?, ?)`,
    [
      input.id,
      input.title,
      input.content,
      JSON.stringify(input.payload ?? {}),
      receivedAt,
      input.openedAt ?? null,
    ]
  );
}

/**
 * 标记一条通知已经被点开。
 */
export async function markNotificationOpened(id: string) {
  const db = await getDb();
  await db.runAsync(
    'UPDATE notification_history SET openedAt = ? WHERE id = ?',
    [Date.now(), id]
  );
}

/**
 * 读取当前设备上的通知历史列表。
 */
export async function getNotificationHistory() {
  await cleanupExpiredHistory();
  const db = await getDb();
  const rows = await db.getAllAsync<HistoryRow>(
    'SELECT id, title, content, receivedAt, openedAt FROM notification_history ORDER BY receivedAt DESC'
  );

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    content: row.content,
    receivedAt: row.receivedAt,
    openedAt: row.openedAt,
  })) satisfies NotificationHistoryItem[];
}

/**
 * 读取单条通知详情，供“通知详情页”展示使用。
 */
export async function getHistoryItem(id: string) {
  const db = await getDb();
  const row = await db.getFirstAsync<HistoryRow>(
    'SELECT id, title, content, receivedAt, openedAt FROM notification_history WHERE id = ?',
    [id]
  );

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    title: row.title,
    content: row.content,
    receivedAt: row.receivedAt,
    openedAt: row.openedAt,
  } satisfies NotificationHistoryItem;
}

/**
 * 删除单条本地通知历史。
 */
export async function deleteHistoryItem(id: string) {
  const db = await getDb();
  await db.runAsync('DELETE FROM notification_history WHERE id = ?', [id]);
}

/**
 * 清空当前设备上的所有通知历史。
 */
export async function clearHistory() {
  const db = await getDb();
  await db.runAsync('DELETE FROM notification_history');
}
