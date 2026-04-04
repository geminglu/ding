import { Body, Controller, Get, Param, Post, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { Public } from "src/decorators/public.decorator";
import { ResultData } from "src/utils/result";
import { SendNotifyDto } from "./dto/send-notify.dto";
import { NotifyService } from "./notify.service";

@ApiTags("notify")
@Public()
@Controller({ path: "notify", version: "1" })
export class NotifyController {
  constructor(private readonly notifyService: NotifyService) {}

  @Get(":key")
  async sendByGet(
    @Param("key") key: string,
    @Query() query: SendNotifyDto,
    @Req() request: Request,
  ) {
    const data = await this.notifyService.send(key, query, request.ip);
    return ResultData.ok(data, "通知发送成功");
  }

  @Post(":key")
  async sendByPost(
    @Param("key") key: string,
    @Body() body: SendNotifyDto,
    @Req() request: Request,
  ) {
    const data = await this.notifyService.send(key, body, request.ip);
    return ResultData.ok(data, "通知发送成功");
  }
}
