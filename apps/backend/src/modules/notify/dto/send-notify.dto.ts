import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import type { TransformFnParams } from "class-transformer";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

const trimText = ({ value }: TransformFnParams) =>
  typeof value === "string" ? value.trim() : "";

export class SendNotifyDto {
  @ApiProperty({ description: "通知标题", maxLength: 20 })
  @Transform(trimText)
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  title: string;

  @ApiProperty({ description: "通知内容", maxLength: 100 })
  @Transform(trimText)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  content: string;
}
