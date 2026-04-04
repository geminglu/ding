import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class RegisterOrLoginDto {
  @ApiProperty({ description: "Taro.login 获取的临时 code" })
  @IsString()
  @IsNotEmpty()
  code: string;
}
