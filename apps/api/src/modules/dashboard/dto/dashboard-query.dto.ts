import { ApiProperty } from '@nestjs/swagger';
import { IsoDate } from '../../../common/validation/decorators';

export class DashboardQueryDto {
  @ApiProperty({ format: 'date', example: '2026-08-01', description: 'Início do período.' })
  @IsoDate('Informe a data inicial do período.')
  from: string;

  @ApiProperty({
    format: 'date',
    example: '2026-10-26',
    description: 'Fim do período (inclusive).',
  })
  @IsoDate('Informe a data final do período.')
  to: string;
}
