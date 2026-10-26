import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MEMBER_ROLES, type MemberRole } from '@nexus/shared';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import {
  NormalizedEmail,
  StrongPassword,
  TrimmedText,
} from '../../../common/validation/decorators';

export class CreateInvitationDto {
  @ApiProperty({ example: 'nova.pessoa@empresa.example' })
  @NormalizedEmail()
  email: string;

  @ApiProperty({ enum: MEMBER_ROLES })
  @IsIn(MEMBER_ROLES, { message: 'Selecione o perfil.' })
  role: MemberRole;
}

export class InvitationTokenDto {
  @ApiProperty({ description: 'Token recebido no link do convite.' })
  @IsString({ message: 'Convite inválido.' })
  @MinLength(20, { message: 'Convite inválido.' })
  @MaxLength(200, { message: 'Convite inválido.' })
  token: string;
}

/** Nome e senha são obrigatórios apenas quando ainda não existe conta com o e-mail convidado. */
export class AcceptInvitationDto extends InvitationTokenDto {
  @ApiPropertyOptional({ example: 'Nova Pessoa' })
  @IsOptional()
  @TrimmedText('o nome', 2, 120)
  name?: string;

  @ApiPropertyOptional({ description: 'Senha da nova conta.' })
  @IsOptional()
  @StrongPassword()
  password?: string;
}
