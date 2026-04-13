import { Module } from "@nestjs/common";
import { PushModule } from "../push/push.module";
import { WechatModule } from "../wechat/wechat.module";
import { NotifyController } from "./notify.controller";
import { NotifyRateLimitService } from "./notify-rate-limit.service";
import { NotifyService } from "./notify.service";

@Module({
  imports: [WechatModule, PushModule],
  controllers: [NotifyController],
  providers: [NotifyService, NotifyRateLimitService],
})
export class NotifyModule {}
