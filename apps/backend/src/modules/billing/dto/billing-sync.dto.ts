import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { AppOrderStatus, AppPlan, AppStorePlatform } from "@prisma/client";
import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

const trimValue = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

export class BillingSyncDto {
  @ApiProperty({ description: "当前安装实例唯一标识" })
  @Transform(trimValue)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  installationId: string;

  @ApiProperty({ enum: AppStorePlatform, description: "订阅所属平台" })
  @IsEnum(AppStorePlatform)
  platform: AppStorePlatform;

  @ApiProperty({ description: "商店商品 ID" })
  @Transform(trimValue)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  productId: string;

  @ApiProperty({ enum: AppPlan, description: "订阅套餐" })
  @IsEnum(AppPlan)
  plan: AppPlan;

  @ApiProperty({ enum: AppOrderStatus, description: "订阅状态" })
  @IsEnum(AppOrderStatus)
  status: AppOrderStatus;

  @ApiPropertyOptional({ description: "RevenueCat 或商店 customerId" })
  @Transform(trimValue)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  providerCustomerId?: string;

  @ApiPropertyOptional({ description: "交易 ID" })
  @Transform(trimValue)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  storeTransactionId?: string;

  @ApiPropertyOptional({ description: "原始交易 ID" })
  @Transform(trimValue)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  originalTransactionId?: string;

  @ApiPropertyOptional({ description: "购买时间" })
  @IsOptional()
  @IsDateString()
  purchasedAt?: string;

  @ApiPropertyOptional({ description: "到期时间" })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ description: "是否沙盒订单" })
  @IsOptional()
  @IsBoolean()
  isSandbox?: boolean;

  @ApiPropertyOptional({ description: "原始同步载荷" })
  @IsOptional()
  @IsObject()
  rawPayload?: Record<string, unknown>;
}
