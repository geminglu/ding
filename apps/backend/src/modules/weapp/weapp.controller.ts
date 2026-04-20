import { Body, Controller, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "src/decorators/public.decorator";
import { ResultData } from "src/utils/result";
import { GenerateOpenLinkDto } from "./dto/generate-open-link.dto";
import { RegisterOrLoginDto } from "./dto/register-or-login.dto";
import { RotateKeyDto } from "./dto/rotate-key.dto";
import { WeappService } from "./weapp.service";

@ApiTags("weapp")
@Public()
@Controller({ path: "weapp", version: "1" })
export class WeappController {
  constructor(private readonly weappService: WeappService) {}

  @Post("auth/register-or-login")
  async registerOrLogin(@Body() body: RegisterOrLoginDto) {
    const data = await this.weappService.registerOrLogin(body.code);
    return ResultData.ok(data, "注册成功");
  }

  @Post("key/rotate")
  async rotateKey(@Body() body: RotateKeyDto) {
    const data = await this.weappService.rotateKey(body.code);
    return ResultData.ok(data, "key 更换成功");
  }

  @Post("open-link/generate")
  @Public()
  async generateOpenLink(@Body() body: GenerateOpenLinkDto) {
    const data = await this.weappService.generateOpenLink({
      path: body.path,
      query: body.query,
      envVersion: body.envVersion,
    });
    return ResultData.ok(data, "生成微信链接成功");
  }
}
