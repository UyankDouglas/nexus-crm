import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import type { AcceptInvitationResponse, InvitationItem, InvitationPreview } from '@nexus/shared';
import type { Request, Response } from 'express';
import type { TenantAuthContext } from '../../common/auth/auth-context';
import {
  AuthRateLimit,
  CurrentTenant,
  Public,
  RequirePermissions,
} from '../../common/auth/auth.decorators';
import { uuidParam } from '../../common/pipes/uuid-param.pipe';
import { getRequestMeta } from '../../common/utils/request-meta';
import { AuthCookiesService } from '../auth/auth-cookies.service';
import { SessionsService } from '../auth/sessions.service';
import {
  AcceptInvitationDto,
  CreateInvitationDto,
  InvitationTokenDto,
} from './dto/invitation-request.dto';
import {
  AcceptInvitationResponseDto,
  InvitationDto,
  InvitationPreviewDto,
} from './dto/invitation-response.dto';
import { InvitationsService } from './invitations.service';

const invitationId = uuidParam('Convite não encontrado.');

/** Gestão de convites da organização ativa (somente administradores). */
@ApiTags('Convites')
@ApiCookieAuth('session')
@Controller('organizations/current/invitations')
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  @Get()
  @RequirePermissions('members:manage')
  @ApiOperation({ summary: 'Convites pendentes' })
  @ApiOkResponse({ type: [InvitationDto] })
  list(@CurrentTenant() auth: TenantAuthContext): Promise<InvitationItem[]> {
    return this.invitations.list(auth);
  }

  @Post()
  @RequirePermissions('members:manage')
  @ApiSecurity('csrf')
  @ApiOperation({ summary: 'Convida uma pessoa por e-mail, com o perfil escolhido' })
  @ApiCreatedResponse({ type: InvitationDto })
  @ApiConflictResponse({ description: 'Já é membro ou já há convite pendente.' })
  create(
    @CurrentTenant() auth: TenantAuthContext,
    @Body() dto: CreateInvitationDto,
  ): Promise<InvitationItem> {
    return this.invitations.create(auth, dto);
  }

  @Post(':invitationId/resend')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('members:manage')
  @ApiSecurity('csrf')
  @ApiOperation({ summary: 'Reenvia o convite com um novo link e nova validade' })
  @ApiOkResponse({ type: InvitationDto })
  @ApiNotFoundResponse()
  resend(
    @CurrentTenant() auth: TenantAuthContext,
    @Param('invitationId', invitationId) id: string,
  ): Promise<InvitationItem> {
    return this.invitations.resend(auth, id);
  }

  @Delete(':invitationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('members:manage')
  @ApiSecurity('csrf')
  @ApiOperation({ summary: 'Cancela um convite pendente (o link deixa de funcionar)' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  revoke(
    @CurrentTenant() auth: TenantAuthContext,
    @Param('invitationId', invitationId) id: string,
  ): Promise<void> {
    return this.invitations.revoke(auth, id);
  }
}

/**
 * Aceite público do convite. O token vai no corpo (não na URL da API) e as rotas têm o limite
 * de requisições das rotas de autenticação.
 */
@ApiTags('Convites')
@Controller('invitations')
export class PublicInvitationsController {
  constructor(
    private readonly invitations: InvitationsService,
    private readonly sessions: SessionsService,
    private readonly cookies: AuthCookiesService,
  ) {}

  @Public()
  @AuthRateLimit()
  @Post('preview')
  @HttpCode(HttpStatus.OK)
  @ApiSecurity('csrf')
  @ApiOperation({ summary: 'Dados do convite para a página de aceite' })
  @ApiOkResponse({ type: InvitationPreviewDto })
  @ApiBadRequestResponse({ description: 'Convite inválido, expirado ou já utilizado.' })
  @ApiTooManyRequestsResponse()
  preview(@Body() dto: InvitationTokenDto): Promise<InvitationPreview> {
    return this.invitations.preview(dto.token);
  }

  @Public()
  @AuthRateLimit()
  @Post('accept')
  @HttpCode(HttpStatus.OK)
  @ApiSecurity('csrf')
  @ApiOperation({
    summary: 'Aceita o convite',
    description:
      'Sem conta com o e-mail convidado, cria a conta (nome e senha) e já inicia a sessão. ' +
      'Com conta existente, apenas adiciona a organização — a pessoa entra com a própria senha.',
  })
  @ApiOkResponse({ type: AcceptInvitationResponseDto })
  @ApiBadRequestResponse({ description: 'Convite inválido ou dados da nova conta ausentes.' })
  @ApiTooManyRequestsResponse()
  async accept(
    @Body() dto: AcceptInvitationDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AcceptInvitationResponse> {
    const accepted = await this.invitations.accept(dto);
    if (accepted.accountCreated) {
      const session = await this.sessions.create(
        accepted.userId,
        accepted.organizationId,
        getRequestMeta(request),
      );
      this.cookies.setSession(response, session.token, session.expiresAt);
    }
    return {
      organizationId: accepted.organizationId,
      organizationName: accepted.organizationName,
      accountCreated: accepted.accountCreated,
      signedIn: accepted.accountCreated,
    };
  }
}
