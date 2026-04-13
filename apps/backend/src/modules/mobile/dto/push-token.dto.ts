import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

const trimValue = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

export class PushTokenDto {
  @ApiProperty({ description: "当前安装实例唯一标识" })
  @Transform(trimValue)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  installationId: string;

  @ApiPropertyOptional({ description: "Expo push token，传空字符串表示清除" })
  @Transform(trimValue)
  @IsOptional()
  @IsString()
  @MaxLength(255)
  pushToken?: string;
}
