import { Logger, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import config from "./config";
import { BillingModule } from "./modules/billing/billing.module";
import { MobileModule } from "./modules/mobile/mobile.module";
import { NotifyModule } from "./modules/notify/notify.module";
import { PushModule } from "./modules/push/push.module";
import { WeappModule } from "./modules/weapp/weapp.module";
import { WechatModule } from "./modules/wechat/wechat.module";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [".env.local", `.env.${process.env.NODE_ENV}`, ".env"],
      isGlobal: true,
      load: [config],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    WechatModule,
    PushModule,
    BillingModule,
    MobileModule,
    WeappModule,
    NotifyModule,
  ],
  controllers: [AppController],
  providers: [AppService, Logger],
})
export class AppModule {}
