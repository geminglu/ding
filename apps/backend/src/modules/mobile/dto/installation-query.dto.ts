import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

const trimValue = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

export class InstallationQueryDto {
  @ApiProperty({ description: "当前安装实例唯一标识" })
  @Transform(trimValue)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  installationId: string;
}

export class ProfileResponse {
  @ApiProperty({ description: "用户 ID" })
  @IsString()
  userId: string;
}
