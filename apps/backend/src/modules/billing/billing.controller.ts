import { Body, Controller, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "src/decorators/public.decorator";
import { ResultData } from "src/utils/result";
import { BillingSyncDto } from "./dto/billing-sync.dto";
import { BillingService } from "./billing.service";

@ApiTags("billing")
@Public()
@Controller({ path: "billing", version: "1" })
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post("sync")
  async sync(@Body() body: BillingSyncDto) {
    const data = await this.billingService.syncSubscription(body);
    return ResultData.ok(data, "订阅状态同步成功");
  }

  @Post("webhook/revenuecat")
  async revenueCatWebhook(@Body() body: Record<string, unknown>) {
    const data = await this.billingService.handleRevenueCatWebhook(body);
    return ResultData.ok(data, "webhook 已接收");
  }
}
