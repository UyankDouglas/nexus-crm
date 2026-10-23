import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { CsrfResponse, MeResponse, MessageResponse } from '@nexus/shared';
import type { Request, Response } from 'express';
import type { AuthContext } from '../../common/auth/auth-context';
import {
  AllowWithoutOrganization,
  AuthRateLimit,
  CurrentAuth,
  Public,
} from '../../common/auth/auth.decorators';
import { getRequestMeta } from '../../common/utils/request-meta';
import { AuthCookiesService } from './auth-cookies.service';
import { AuthService, type AuthResult } from './auth.service';
import { CsrfService } from './csrf.service';
import {
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  SwitchOrganizationDto,
} from './dto/auth-request.dto';
import { CsrfResponseDto, MeResponseDto, MessageResponseDto } from './dto/auth-response.dto';

@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly csrf: CsrfService,
    private readonly cookies: AuthCookiesService,
  ) {}

  @Public()
  @Get('csrf')
  @ApiOperation({
    summary: 'Obtém o token CSRF',
    description: 'Deve ser enviado no cabeçalho `X-CSRF-Token` em requisições de escrita.',
  })
  @ApiOkResponse({ type: CsrfResponseDto })
  getCsrfToken(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): CsrfResponse {
    const current = this.cookies.readCsrf(request);
    const csrfToken = this.csrf.isValid(current) ? current : this.csrf.generate();
    this.cookies.setCsrf(response, csrfToken);
    return { csrfToken };
  }

  @Public()
  @AuthRateLimit()
  @Post('register')
  @ApiSecurity('csrf')
  @ApiOperation({ summary: 'Cadastra uma organização e seu administrador' })
  @ApiCreatedResponse({ type: MeResponseDto })
  @ApiConflictResponse({ description: 'E-mail já cadastrado.' })
  @ApiTooManyRequestsResponse()
  async register(
    @Body() dto: RegisterDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<MeResponse> {
    return this.withSessionCookie(response, await this.auth.register(dto, getRequestMeta(request)));
  }

  @Public()
  @AuthRateLimit()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiSecurity('csrf')
  @ApiOperation({ summary: 'Autentica o usuário e inicia uma sessão (cookie HttpOnly)' })
  @ApiOkResponse({ type: MeResponseDto })
  @ApiUnauthorizedResponse({ description: 'E-mail ou senha incorretos.' })
  @ApiTooManyRequestsResponse()
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<MeResponse> {
    return this.withSessionCookie(response, await this.auth.login(dto, getRequestMeta(request)));
  }

  @AllowWithoutOrganization()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiCookieAuth('session')
  @ApiSecurity('csrf')
  @ApiOperation({ summary: 'Encerra e revoga a sessão atual' })
  @ApiNoContentResponse()
  async logout(
    @CurrentAuth() auth: AuthContext,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.auth.logout(auth);
    this.cookies.clearSession(response);
  }

  @AllowWithoutOrganization()
  @Get('me')
  @ApiCookieAuth('session')
  @ApiOperation({ summary: 'Retorna o usuário autenticado, seus vínculos e a organização ativa' })
  @ApiOkResponse({ type: MeResponseDto })
  @ApiUnauthorizedResponse()
  me(@CurrentAuth() auth: AuthContext): Promise<MeResponse> {
    return this.auth.buildMe(auth);
  }

  @AllowWithoutOrganization()
  @Post('switch-organization')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('session')
  @ApiSecurity('csrf')
  @ApiOperation({ summary: 'Define a organização ativa da sessão' })
  @ApiOkResponse({ type: MeResponseDto })
  @ApiForbiddenResponse({ description: 'Usuário sem vínculo ativo com a organização.' })
  switchOrganization(
    @CurrentAuth() auth: AuthContext,
    @Body() dto: SwitchOrganizationDto,
  ): Promise<MeResponse> {
    return this.auth.switchOrganization(auth, dto.organizationId);
  }

  @Public()
  @AuthRateLimit()
  @Post('forgot-password')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiSecurity('csrf')
  @ApiOperation({ summary: 'Solicita o link de redefinição de senha' })
  @ApiAcceptedResponse({ type: MessageResponseDto })
  forgotPassword(@Body() dto: ForgotPasswordDto): Promise<MessageResponse> {
    return this.auth.requestPasswordReset(dto);
  }

  @Public()
  @AuthRateLimit()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiSecurity('csrf')
  @ApiOperation({ summary: 'Redefine a senha e encerra todas as sessões do usuário' })
  @ApiOkResponse({ type: MessageResponseDto })
  resetPassword(@Body() dto: ResetPasswordDto): Promise<MessageResponse> {
    return this.auth.resetPassword(dto);
  }

  private withSessionCookie(response: Response, result: AuthResult): MeResponse {
    this.cookies.setSession(response, result.token, new Date(result.me.session.expiresAt));
    return result.me;
  }
}
