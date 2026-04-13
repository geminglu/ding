import { apiRequest } from "@/lib/api";
import type { AppProfile } from "./type";

export function testNotify(installationId: string) {
  return apiRequest("/api/v1/mobile/test-notify", {
    method: "POST",
    body: {
      installationId,
      title: "title",
      content: "content",
    },
  });
}

export function bootstrapApi({
  installationId,
  platform,
  deviceName,
  appVersion,
}: {
  installationId: string;
  platform: any;
  deviceName: string;
  appVersion: string;
}) {
  return apiRequest<AppProfile>("/api/v1/mobile/bootstrap", {
    method: "POST",
    body: {
      installationId,
      platform,
      deviceName,
      appVersion,
    },
  });
}
