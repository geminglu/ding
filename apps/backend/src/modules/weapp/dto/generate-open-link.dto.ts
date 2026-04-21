import { ApiProperty } from "@nestjs/swagger";
import type { TransformFnParams } from "class-transformer";
import { Transform } from "class-transformer";
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

const trimText = ({ value }: TransformFnParams): string =>
  typeof value === "string" ? value.trim() : "";

const normalizePath = ({ value }: TransformFnParams): string => {
  const trimmedValue = trimText({ value } as TransformFnParams);
  return trimmedValue.replace(/^\/+/, "");
};

const normalizeQuery = ({ value }: TransformFnParams): string => {
  const trimmedValue = trimText({ value } as TransformFnParams);
  return trimmedValue.replace(/^\?+/, "");
};

const normalizeEnvVersion = ({ value }: TransformFnParams): string => {
  const trimmedValue = trimText({ value } as TransformFnParams);
  return trimmedValue || "release";
};

/**
 * 生成微信小程序唤起链接的入参。
 */
export class GenerateOpenLinkDto {
  @ApiProperty({ description: "小程序页面路径，例如 pages/index/index" })
  @Transform(normalizePath)
  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  path: string;

  @ApiProperty({
    description: "小程序页面参数，例如 foo=1&bar=2",
    required: false,
    default: "",
  })
  @Transform(normalizeQuery)
  @IsString()
  @IsOptional()
  @MaxLength(1024)
  query: string = "";

  @ApiProperty({
    description: "小程序环境版本",
    enum: ["release", "trial", "develop"],
    required: false,
    default: "release",
  })
  @Transform(normalizeEnvVersion)
  @IsString()
  @IsOptional()
  @IsIn(["release", "trial", "develop"])
  envVersion: "release" | "trial" | "develop" = "release";
}

export class GenerateOpenLinkResponseDto {
  @ApiProperty({ description: "小程序打开链接" })
  urlLink: string;

  @ApiProperty({ description: "小程序 Scheme" })
  scheme: string;
}
