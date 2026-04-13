import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

const trimValue = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

export class TestNotifyDto {
  @ApiPropertyOptional({ description: "当前安装实例唯一标识" })
  @Transform(trimValue)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  installationId: string;

  @ApiPropertyOptional({ description: "测试通知标题", maxLength: 20 })
  @Transform(trimValue)
  @IsOptional()
  @IsString()
  @MaxLength(20)
  title?: string;

  @ApiPropertyOptional({ description: "测试通知内容", maxLength: 100 })
  @Transform(trimValue)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  content?: string;
}
