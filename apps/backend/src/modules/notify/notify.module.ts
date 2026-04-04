import { Module } from "@nestjs/common";
import { WechatModule } from "../wechat/wechat.module";
import { NotifyController } from "./notify.controller";
import { NotifyRateLimitService } from "./notify-rate-limit.service";
import { NotifyService } from "./notify.service";

@Module({
  imports: [WechatModule],
  controllers: [NotifyController],
  providers: [NotifyService, NotifyRateLimitService],
})
export class NotifyModule {}
