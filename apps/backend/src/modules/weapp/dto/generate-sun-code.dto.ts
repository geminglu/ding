import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

const trimText = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const normalizePage = (value: unknown): string => {
  const trimmedValue = trimText(value);
  return trimmedValue.replace(/^\/+/, "");
};

const normalizeEnvVersion = (value: unknown): string => {
  const trimmedValue = trimText(value);
  return trimmedValue || "release";
};

const normalizeWidth = (value: unknown): number => {
  if (value === undefined || value === null || value === "") {
    return 430;
  }
  return Number(value);
};

const normalizeBoolean = (value: unknown): boolean => {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    return value === "true";
  }
  return Boolean(value);
};

/**
 * 生成微信小程序太阳码的入参。
 */
export class GenerateSunCodeDto {
  @ApiProperty({ description: "小程序页面路径，例如 pages/index/index" })
  @Transform(({ value }: { value: unknown }) => normalizePage(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  page: string;

  @ApiProperty({
    description: "小程序码参数，最大 32 个可见字符，例如 foo=1",
  })
  @Transform(({ value }: { value: unknown }) => trimText(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  scene: string;

  @ApiProperty({
    description: "小程序环境版本",
    enum: ["release", "trial", "develop"],
    required: false,
    default: "release",
  })
  @Transform(({ value }: { value: unknown }) => normalizeEnvVersion(value))
  @IsString()
  @IsOptional()
  @IsIn(["release", "trial", "develop"])
  envVersion: "release" | "trial" | "develop" = "release";

  @ApiProperty({
    description: "太阳码宽度，单位 px",
    required: false,
    default: 430,
    minimum: 280,
    maximum: 1280,
  })
  @Transform(({ value }: { value: unknown }) => normalizeWidth(value))
  @IsInt()
  @IsOptional()
  @Min(280)
  @Max(1280)
  width: number = 430;

  @ApiProperty({
    description: "是否校验 page 是否存在",
    required: false,
    default: true,
  })
  @Transform(({ value }: { value: unknown }) => normalizeBoolean(value))
  @IsBoolean()
  @IsOptional()
  checkPath: boolean = true;
}

export class GenerateSunCodeResponseDto {
  @ApiProperty({ description: "太阳码类型" })
  contentType: string;

  @ApiProperty({ description: "太阳码图片 base64 数据" })
  imageBase64: string;

  @ApiProperty({ description: "太阳码图片 data URL" })
  dataUrl: string;
}
