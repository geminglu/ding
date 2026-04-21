import { Button, ScrollView, Text, View } from "@tarojs/components";
import Taro, { useRouter, useShareAppMessage } from "@tarojs/taro";
import { useMemo } from "react";
import {
  buildNotifyCurlExample,
  buildNotifyGetExample,
  buildNotifyPostExample,
  buildSharePagePath,
} from "../../services/weapp";

import "./index.less";

const Index = () => {
  const router = useRouter();
  const key = useMemo(() => {
    const value = router.params.key;
    if (!value) {
      return "";
    }

    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }, [router.params.key]);

  useShareAppMessage(() => ({
    title: "小程序通知 URL",
    path: key ? buildSharePagePath(key) : "/pages/share/index",
  }));

  const getExample = key ? buildNotifyGetExample(key) : "";
  const postExample = key ? buildNotifyPostExample(key) : "";
  const curlExample = key ? buildNotifyCurlExample(key) : "";

  const copyText = async (text: string, successTitle: string) => {
    await Taro.setClipboardData({ data: text });
    await Taro.showToast({
      title: successTitle,
      icon: "success",
    });
  };

  return (
    <ScrollView className="share-page" scrollY>
      <View className="share-page__card">
        <Text className="share-page__title">分享通知 URL</Text>
        <Text className="share-page__text">
          任何拿到 key
          的人都可以向对应用户发送通知，如怀疑泄漏请立即返回首页更换 key。
        </Text>
      </View>

      {!key ? (
        <View className="share-page__card">
          <Text className="share-page__text">
            当前没有可分享的 key，请回到首页重新发起分享。
          </Text>
        </View>
      ) : (
        <>
          <View className="share-page__card">
            <Text className="share-page__title">GET URL</Text>
            <Text className="share-page__code">{getExample}</Text>
            <View className="share-page__actions">
              <Button
                className="share-page__button"
                onClick={() => void copyText(getExample, "GET URL 已复制")}
              >
                复制 GET
              </Button>
              <Button className="share-page__button" openType="share">
                继续分享
              </Button>
            </View>
          </View>

          <View className="share-page__card">
            <Text className="share-page__title">POST URL</Text>
            <Text className="share-page__code">{postExample}</Text>
            <View className="share-page__actions">
              <Button
                className="share-page__button"
                onClick={() => void copyText(postExample, "POST URL 已复制")}
              >
                复制 POST URL
              </Button>
              <Button
                className="share-page__button"
                onClick={() => void copyText(curlExample, "curl 示例已复制")}
              >
                复制 curl
              </Button>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
};

export default Index;
