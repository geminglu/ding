import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

const trimValue = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

export class RestoreCodeDto {
  @ApiProperty({ description: "当前安装实例唯一标识" })
  @Transform(trimValue)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  installationId: string;

  @ApiProperty({ description: "恢复码" })
  @Transform(trimValue)
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  restoreCode: string;
}
