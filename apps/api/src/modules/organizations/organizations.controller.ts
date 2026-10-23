import { Body, Controller, Get, Patch } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import type { OrganizationMemberItem, OrganizationSummary } from '@nexus/shared';
import type { TenantAuthContext } from '../../common/auth/auth-context';
import { CurrentTenant, RequirePermissions } from '../../common/auth/auth.decorators';
import {
  OrganizationMemberDto,
  OrganizationSummaryDto,
  UpdateOrganizationDto,
} from './dto/organization.dto';
import { OrganizationsService } from './organizations.service';

/**
 * As rotas operam sempre sobre a organização ativa da sessão (`/current`): não há
 * `organizationId` na URL ou no corpo que possa ser manipulado pelo cliente.
 */
@ApiTags('Organizações')
@ApiCookieAuth('session')
@Controller('organizations/current')
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Get()
  @RequirePermissions('organization:read')
  @ApiOperation({ summary: 'Resumo da organização ativa' })
  @ApiOkResponse({ type: OrganizationSummaryDto })
  getCurrent(@CurrentTenant() auth: TenantAuthContext): Promise<OrganizationSummary> {
    return this.organizations.getSummary(auth.organization.id);
  }

  @Patch()
  @RequirePermissions('organization:update')
  @ApiSecurity('csrf')
  @ApiOperation({ summary: 'Atualiza os dados da organização ativa (somente administradores)' })
  @ApiOkResponse({ type: OrganizationSummaryDto })
  @ApiForbiddenResponse({ description: 'Perfil sem permissão.' })
  updateCurrent(
    @CurrentTenant() auth: TenantAuthContext,
    @Body() dto: UpdateOrganizationDto,
  ): Promise<OrganizationSummary> {
    return this.organizations.update(auth.organization.id, dto);
  }

  @Get('members')
  @RequirePermissions('members:read')
  @ApiOperation({ summary: 'Lista os membros da organização ativa (administradores e gestores)' })
  @ApiOkResponse({ type: OrganizationMemberDto, isArray: true })
  @ApiForbiddenResponse({ description: 'Perfil sem permissão.' })
  listMembers(@CurrentTenant() auth: TenantAuthContext): Promise<OrganizationMemberItem[]> {
    return this.organizations.listMembers(auth.organization.id);
  }
}
