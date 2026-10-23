import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { HealthResponse } from '@nexus/shared';
import type { Response } from 'express';
import { Public } from '../../common/auth/auth.decorators';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Saúde')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @SkipThrottle()
  @Get()
  @ApiOperation({ summary: 'Verifica a disponibilidade da API e do banco de dados' })
  @ApiOkResponse({ description: 'API e banco disponíveis.' })
  @ApiServiceUnavailableResponse({ description: 'Banco de dados indisponível.' })
  async check(@Res({ passthrough: true }) response: Response): Promise<HealthResponse> {
    const timestamp = new Date().toISOString();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'up', timestamp };
    } catch {
      response.status(HttpStatus.SERVICE_UNAVAILABLE);
      return { status: 'error', database: 'down', timestamp };
    }
  }
}
