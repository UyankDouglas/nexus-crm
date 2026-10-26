import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  MEMBER_ROLES,
  MEMBERSHIP_STATUSES,
  type MemberRole,
  type MembershipStatus,
  type OrganizationMemberItem,
  type OrganizationSummary,
} from '@nexus/shared';
import { IsIn, IsOptional } from 'class-validator';
import { TrimmedText } from '../../../common/validation/decorators';

export class UpdateOrganizationDto {
  @ApiProperty({ example: 'Horizonte Tecnologia', minLength: 2, maxLength: 120 })
  @TrimmedText('o nome da organização', 2, 120)
  name: string;
}

/** Alteração de perfil e/ou situação do vínculo (somente administradores). */
export class UpdateMemberDto {
  @ApiPropertyOptional({ enum: MEMBER_ROLES })
  @IsOptional()
  @IsIn(MEMBER_ROLES, { message: 'Perfil inválido.' })
  role?: MemberRole;

  @ApiPropertyOptional({ enum: MEMBERSHIP_STATUSES, description: 'SUSPENDED revoga o acesso.' })
  @IsOptional()
  @IsIn(MEMBERSHIP_STATUSES, { message: 'Situação inválida.' })
  status?: MembershipStatus;
}

class MembersByRoleDto implements Record<MemberRole, number> {
  @ApiProperty() ADMIN: number;
  @ApiProperty() MANAGER: number;
  @ApiProperty() SALES: number;
}

export class OrganizationSummaryDto implements OrganizationSummary {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() name: string;
  @ApiProperty() slug: string;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
  @ApiProperty({ description: 'Membros com vínculo ativo' }) memberCount: number;
  @ApiProperty({ type: MembersByRoleDto }) membersByRole: MembersByRoleDto;
}

export class OrganizationMemberDto implements OrganizationMemberItem {
  @ApiProperty({ format: 'uuid' }) membershipId: string;
  @ApiProperty({ format: 'uuid' }) userId: string;
  @ApiProperty() name: string;
  @ApiProperty() email: string;
  @ApiProperty({ enum: MEMBER_ROLES }) role: MemberRole;
  @ApiProperty({ enum: MEMBERSHIP_STATUSES }) status: MembershipStatus;
  @ApiProperty({ format: 'date-time' }) joinedAt: string;
  @ApiProperty({ format: 'date-time', nullable: true, type: String }) lastLoginAt: string | null;
}
