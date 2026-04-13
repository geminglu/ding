import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ApiExtraModels, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "src/decorators/public.decorator";
import { ResSuccess } from "src/utils/api.Response";
import { ResultData } from "src/utils/result";
import { BootstrapDto } from "./dto/bootstrap.dto";
import {
  InstallationQueryDto,
  ProfileResponse,
} from "./dto/installation-query.dto";
import { PushTokenDto } from "./dto/push-token.dto";
import { ResetKeyDto } from "./dto/reset-key.dto";
import { RestoreCodeDto } from "./dto/restore-code.dto";
import { TestNotifyDto } from "./dto/test-notify.dto";
import { MobileService } from "./mobile.service";

@ApiTags("mobile")
@Public()
@Controller({ path: "mobile", version: "1" })
@ApiExtraModels(ProfileResponse)
export class MobileController {
  constructor(private readonly mobileService: MobileService) {}

  @Post("bootstrap")
  @ApiOperation({
    summary: "初始化",
    description: "初始化设备",
  })
  @ResSuccess()
  @Public()
  async bootstrap(@Body() body: BootstrapDto) {
    const data = await this.mobileService.bootstrap(body);
    return ResultData.ok(data, "初始化成功");
  }

  @Get("profile")
  @ApiOperation({
    summary: "获取用户资料",
    description: "根据设备 ID 获取用户资料",
  })
  @ResSuccess(ProfileResponse)
  @Public()
  async profile(@Query() query: InstallationQueryDto) {
    const data = await this.mobileService.getProfile(query.installationId);
    return ResultData.ok(data, "获取资料成功");
  }

  @Post("push-token")
  async updatePushToken(@Body() body: PushTokenDto) {
    const data = await this.mobileService.updatePushToken(body);
    return ResultData.ok(data, "推送配置已更新");
  }

  @Post("test-notify")
  async testNotify(@Body() body: TestNotifyDto) {
    await this.mobileService.sendTestNotification(body);
    return ResultData.ok(null, "测试通知发送成功");
  }

  @Post("key/reset")
  async resetKey(@Body() body: ResetKeyDto) {
    const data = await this.mobileService.resetKey(body);
    return ResultData.ok(data, "key 已重置");
  }

  @Post("restore-code")
  async restoreByCode(@Body() body: RestoreCodeDto) {
    const data = await this.mobileService.restoreByCode(body);
    return ResultData.ok(data, "恢复成功");
  }

  @Get("order-status")
  async orderStatus(@Query() query: InstallationQueryDto) {
    const data = await this.mobileService.getOrderStatus(query.installationId);
    return ResultData.ok(data, "获取订单状态成功");
  }
}
