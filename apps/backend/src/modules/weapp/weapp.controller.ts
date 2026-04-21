import { Body, Controller, Post } from "@nestjs/common";
import { ApiExtraModels, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "src/decorators/public.decorator";
import { ResSuccess } from "src/utils/api.Response";
import { ResultData } from "src/utils/result";
import {
  GenerateOpenLinkDto,
  GenerateOpenLinkResponseDto,
} from "./dto/generate-open-link.dto";
import {
  GenerateSunCodeDto,
  GenerateSunCodeResponseDto,
} from "./dto/generate-sun-code.dto";
import { RegisterOrLoginDto } from "./dto/register-or-login.dto";
import { RotateKeyDto } from "./dto/rotate-key.dto";
import { WeappService } from "./weapp.service";

@ApiTags("weapp")
@Public()
@ApiExtraModels(GenerateSunCodeResponseDto, GenerateOpenLinkResponseDto)
@Controller({ path: "weapp", version: "1" })
export class WeappController {
  constructor(private readonly weappService: WeappService) {}

  @Post("auth/register-or-login")
  async registerOrLogin(@Body() body: RegisterOrLoginDto) {
    const data = await this.weappService.registerOrLogin(body.code);
    return ResultData.ok(data, "注册成功");
  }

  @Post("key/rotate")
  @ApiOperation({ summary: "更换 key" })
  async rotateKey(@Body() body: RotateKeyDto) {
    const data = await this.weappService.rotateKey(body.code);
    return ResultData.ok(data, "key 更换成功");
  }

  @Post("open-link/generate")
  @ApiOperation({ summary: "生成微信小程序打开链接" })
  @ResSuccess(GenerateOpenLinkResponseDto)
  async generateOpenLink(@Body() body: GenerateOpenLinkDto) {
    const data = await this.weappService.generateOpenLink({
      path: body.path,
      query: body.query,
      envVersion: body.envVersion,
    });
    return ResultData.ok(data, "生成微信链接成功");
  }

  @Post("sun-code/generate")
  @ApiOperation({ summary: "生成微信小程序太阳码" })
  @ResSuccess(GenerateSunCodeResponseDto)
  async generateSunCode(@Body() body: GenerateSunCodeDto) {
    const data = await this.weappService.generateSunCode({
      page: body.page,
      scene: body.scene,
      envVersion: body.envVersion,
      width: body.width,
      checkPath: body.checkPath,
    });
    return ResultData.ok(data, "生成微信太阳码成功");
  }
}
