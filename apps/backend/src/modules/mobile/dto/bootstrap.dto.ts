import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { AppPlatform } from "@prisma/client";
import { Transform } from "class-transformer";
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

const trimValue = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

export class BootstrapDto {
  @ApiProperty({ description: "当前安装实例唯一标识" })
  @Transform(trimValue)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  installationId: string;

  @ApiProperty({ enum: AppPlatform, description: "当前设备平台" })
  @IsEnum(AppPlatform)
  platform: AppPlatform;

  @ApiPropertyOptional({ description: "设备名称" })
  @Transform(trimValue)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  deviceName?: string;

  @ApiPropertyOptional({ description: "应用版本号" })
  @Transform(trimValue)
  @IsOptional()
  @IsString()
  @MaxLength(60)
  appVersion?: string;

  @ApiPropertyOptional({ description: "恢复码，用于新设备找回匿名账号" })
  @Transform(trimValue)
  @IsOptional()
  @IsString()
  @MaxLength(64)
  restoreCode?: string;
}
