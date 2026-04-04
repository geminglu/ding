import { Module } from "@nestjs/common";
import { WechatModule } from "../wechat/wechat.module";
import { WeappController } from "./weapp.controller";
import { WeappService } from "./weapp.service";

@Module({
  imports: [WechatModule],
  controllers: [WeappController],
  providers: [WeappService],
  exports: [WeappService],
})
export class WeappModule {}
