import Taro from "@tarojs/taro";

interface SubscriptionResult {
  success: boolean;
  status: string;
}

export const requestNotifySubscription = async (
  templateId: string,
): Promise<SubscriptionResult> => {
  try {
    const result = await Taro.requestSubscribeMessage({
      tmplIds: [templateId],
      entityIds: [templateId],
    });

    const status = result[templateId];

    if (status === "accept") {
      await Taro.showToast({
        title: "订阅成功",
        icon: "success",
      });
      return {
        success: true,
        status,
      };
    }

    if (status === "reject") {
      await Taro.showModal({
        title: "未开启订阅通知",
        content:
          "你已拒绝订阅通知，后续将无法收到消息提醒，可点击“重新订阅”再次开启。",
        showCancel: false,
      });
      return {
        success: false,
        status,
      };
    }

    await Taro.showToast({
      title: "本次未订阅",
      icon: "none",
    });

    return {
      success: false,
      status: String(status || "unknown"),
    };
  } catch (error) {
    await Taro.showToast({
      title: "订阅请求失败",
      icon: "none",
    });

    return {
      success: false,
      status: error instanceof Error ? error.message : "error",
    };
  }
};
