import { ApiProperty } from "@nestjs/swagger";

export class WeappProfileDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  openidMasked: string;

  @ApiProperty()
  key: string;

  @ApiProperty()
  templateId: string;

  @ApiProperty()
  notifyGetExample: string;

  @ApiProperty()
  notifyPostExample: string;

  @ApiProperty({
    type: [String],
    description: "首页可直接展示给用户的风险提示",
  })
  notices: string[];
}
