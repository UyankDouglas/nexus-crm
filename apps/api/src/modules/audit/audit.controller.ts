import { Controller, Get, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuditLogItem, Paginated } from '@nexus/shared';
import type { TenantAuthContext } from '../../common/auth/auth-context';
import { CurrentTenant, RequirePermissions } from '../../common/auth/auth.decorators';
import { AuditService } from './audit.service';
import { ListAuditQueryDto } from './dto/audit-query.dto';
import { PaginatedAuditDto } from './dto/audit-response.dto';

@ApiTags('Auditoria')
@ApiCookieAuth('session')
@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @RequirePermissions('audit:read')
  @ApiOperation({ summary: 'Trilha de auditoria da organização (somente administradores)' })
  @ApiOkResponse({ type: PaginatedAuditDto })
  list(
    @CurrentTenant() auth: TenantAuthContext,
    @Query() query: ListAuditQueryDto,
  ): Promise<Paginated<AuditLogItem>> {
    return this.audit.list(auth, query);
  }
}
