import { ApiProperty } from '@nestjs/swagger';
import type { PageMeta } from '@nexus/shared';

export class PageMetaDto implements PageMeta {
  @ApiProperty() page: number;
  @ApiProperty() pageSize: number;
  @ApiProperty() total: number;
  @ApiProperty() totalPages: number;
}
