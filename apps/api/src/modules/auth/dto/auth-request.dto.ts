import { ApiProperty } from '@nestjs/swagger';
import { PASSWORD_MAX_LENGTH } from '@nexus/shared';
import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';
import {
  NormalizedEmail,
  StrongPassword,
  TrimmedText,
} from '../../../common/validation/decorators';

export class LoginDto {
  @ApiProperty({ example: 'ana.ribeiro@horizonte.example' })
  @NormalizedEmail()
  email: string;

  @ApiProperty({ format: 'password' })
  @IsString({ message: 'Informe a senha.' })
  @IsNotEmpty({ message: 'Informe a senha.' })
  @MaxLength(PASSWORD_MAX_LENGTH, { message: 'Senha inválida.' })
  password: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'Horizonte Tecnologia', minLength: 2, maxLength: 120 })
  @TrimmedText('o nome da organização', 2, 120)
  organizationName: string;

  @ApiProperty({ example: 'Ana Ribeiro', minLength: 2, maxLength: 120 })
  @TrimmedText('o nome', 2, 120)
  name: string;

  @ApiProperty({ example: 'ana.ribeiro@horizonte.example' })
  @NormalizedEmail()
  email: string;

  @ApiProperty({
    format: 'password',
    description: 'Mínimo de 8 caracteres, com pelo menos uma letra e um número.',
  })
  @StrongPassword()
  password: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'ana.ribeiro@horizonte.example' })
  @NormalizedEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token recebido no link de redefinição.' })
  @IsString({ message: 'Link de redefinição inválido.' })
  @IsNotEmpty({ message: 'Link de redefinição inválido.' })
  @MaxLength(256, { message: 'Link de redefinição inválido.' })
  token: string;

  @ApiProperty({ format: 'password' })
  @StrongPassword()
  password: string;
}

export class SwitchOrganizationDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('all', { message: 'Organização inválida.' })
  organizationId: string;
}
