import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class RotateKeyDto {
  @ApiProperty({ description: "用于确认当前微信用户身份的 code" })
  @IsString()
  @IsNotEmpty()
  code: string;
}
