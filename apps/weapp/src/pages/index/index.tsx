import { useCallback, useEffect, useMemo, useState } from "react";
import Taro, { useRouter, useShareAppMessage } from "@tarojs/taro";
import { Button, ScrollView, Text, View } from "@tarojs/components";
import { requestNotifySubscription } from "../../services/subscription";
import {
  buildNotifyCurlExample,
  buildNotifyGetExample,
  buildNotifyPostExample,
  buildSharePagePath,
  registerOrLogin,
  rotateKey,
} from "../../services/weapp";
import type { WeappProfile } from "../../services/weapp";
import {
  getLocalNotifyHistory,
  recordNotificationFromParams,
} from "../../utils/notifyHistory";
import type { NotifyHistoryItem } from "../../utils/notifyHistory";

import "./index.less";

const Index = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<WeappProfile | null>(null);
  const [historyList, setHistoryList] = useState<NotifyHistoryItem[]>(() =>
    getLocalNotifyHistory(),
  );

  useShareAppMessage(() => ({
    title: "小程序通知 URL",
    path: profile ? buildSharePagePath(profile.key) : "/pages/index/index",
  }));

  const initPage = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const loginResult = await Taro.login();

      console.log(loginResult, "loginResult");

      if (!loginResult.code) {
        throw new Error("获取微信登录 code 失败");
      }

      const data = await registerOrLogin(loginResult.code);
      setProfile(data);
    } catch (currentError) {
      const message =
        currentError instanceof Error
          ? currentError.message
          : "初始化失败，请稍后重试";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void initPage();
  }, [initPage]);

  useEffect(() => {
    if (recordNotificationFromParams(router.params)) {
      setHistoryList(getLocalNotifyHistory());
    }
  }, [router.params.content, router.params.title, router.params.ts]);

  const notifyGetExample = useMemo(() => {
    if (!profile) {
      return "";
    }
    return profile.notifyGetExample || buildNotifyGetExample(profile.key);
  }, [profile]);

  const notifyPostExample = useMemo(() => {
    if (!profile) {
      return "";
    }
    return profile.notifyPostExample || buildNotifyPostExample(profile.key);
  }, [profile]);

  const notifyCurlExample = useMemo(() => {
    if (!profile) {
      return "";
    }
    return buildNotifyCurlExample(profile.key);
  }, [profile]);

  const copyText = useCallback(async (text: string, successTitle: string) => {
    await Taro.setClipboardData({ data: text });
    await Taro.showToast({
      title: successTitle,
      icon: "success",
    });
  }, []);

  const handleSubscribe = useCallback(async () => {
    if (!profile || submitting) {
      return;
    }

    setSubmitting(true);
    await requestNotifySubscription(profile.templateId);
    setSubmitting(false);
  }, [profile, submitting]);

  const handleRotateKey = useCallback(async () => {
    if (!profile || submitting) {
      return;
    }

    const confirmResult = await Taro.showModal({
      title: "更换 key",
      content: "更换后旧 key 会立即失效，如怀疑泄漏请立即执行更换。",
    });

    if (!confirmResult.confirm) {
      return;
    }

    setSubmitting(true);

    try {
      const loginResult = await Taro.login();
      if (!loginResult.code) {
        throw new Error("获取微信登录 code 失败");
      }

      const data = await rotateKey(loginResult.code);
      setProfile(data);
      await Taro.showToast({
        title: "key 已更换",
        icon: "success",
      });
    } catch (currentError) {
      await Taro.showToast({
        title:
          currentError instanceof Error
            ? currentError.message
            : "更换 key 失败",
        icon: "none",
      });
    } finally {
      setSubmitting(false);
    }
  }, [profile, submitting]);

  return (
    <ScrollView className="page" scrollY>
      <View className="page__section">
        <Text className="page__title">通知助手</Text>
        <Text className="page__subtitle">
          进入首页后会自动完成注册，外部系统只要携带你的 key 即可调用通知接口。
        </Text>
      </View>

      {loading ? (
        <View className="page__card">
          <Text className="page__value">正在初始化...</Text>
        </View>
      ) : null}

      {error ? (
        <View className="page__card">
          <Text className="page__error">{error}</Text>
          <Button className="page__button" onClick={() => void initPage()}>
            重新加载
          </Button>
        </View>
      ) : null}

      {profile ? (
        <>
          <View className="page__card">
            <Text className="page__card-title">当前 key</Text>
            <Text className="page__value">{profile.key}</Text>
            <Text className="page__hint">微信用户：{profile.openidMasked}</Text>
            <View className="page__actions">
              <Button
                className="page__button"
                onClick={() => void copyText(profile.key, "key 已复制")}
              >
                复制 key
              </Button>
              <Button
                className="page__button page__button--warn"
                loading={submitting}
                onClick={() => void handleRotateKey()}
              >
                更换 key
              </Button>
            </View>
          </View>

          <View className="page__card">
            <Text className="page__card-title">订阅通知</Text>
            <Text className="page__hint">
              请开启订阅通知，否则将无法收到小程序通知。拒绝授权后也可以通过“重新订阅”再次开启。
            </Text>
            <View className="page__actions">
              <Button
                className="page__button"
                loading={submitting}
                onClick={() => void handleSubscribe()}
              >
                重新订阅
              </Button>
            </View>
          </View>

          <View className="page__card">
            <Text className="page__card-title">GET URL 示例</Text>
            <Text className="page__code">{notifyGetExample}</Text>
            <View className="page__actions">
              <Button
                className="page__button"
                onClick={() =>
                  void copyText(notifyGetExample, "GET URL 已复制")
                }
              >
                复制 GET
              </Button>
              <Button className="page__button" openType="share">
                分享 URL
              </Button>
            </View>
          </View>

          <View className="page__card">
            <Text className="page__card-title">POST URL 示例</Text>
            <Text className="page__code">{notifyPostExample}</Text>
            <View className="page__actions">
              <Button
                className="page__button"
                onClick={() =>
                  void copyText(notifyPostExample, "POST URL 已复制")
                }
              >
                复制 POST URL
              </Button>
              <Button
                className="page__button"
                onClick={() =>
                  void copyText(notifyCurlExample, "curl 示例已复制")
                }
              >
                复制 curl
              </Button>
            </View>
          </View>

          <View className="page__card">
            <Text className="page__card-title">本地记录说明</Text>
            {profile.notices.map((notice) => (
              <Text className="page__hint" key={notice}>
                {notice}
              </Text>
            ))}
            <Text className="page__hint">
              点击通知进入小程序后，最近记录会保存在当前设备本地，最多保留 20
              条。
            </Text>
          </View>

          <View className="page__card">
            <Text className="page__card-title">最近通知记录</Text>
            {historyList.length === 0 ? (
              <Text className="page__hint">
                当前还没有本地记录，点击通知进入小程序后会显示在这里。
              </Text>
            ) : (
              historyList.map((item) => (
                <View className="history-item" key={item.id}>
                  <Text className="history-item__title">{item.title}</Text>
                  <Text className="history-item__content">{item.content}</Text>
                  <Text className="history-item__time">
                    {new Date(item.createdAt).toLocaleString()}
                  </Text>
                </View>
              ))
            )}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
};

export default Index;
