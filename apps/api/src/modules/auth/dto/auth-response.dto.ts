import { ApiProperty } from '@nestjs/swagger';
import {
  ALL_PERMISSIONS,
  MEMBER_ROLES,
  type ActiveOrganization,
  type AuthUser,
  type CsrfResponse,
  type MemberRole,
  type MembershipSummary,
  type MeResponse,
  type MessageResponse,
  type Permission,
} from '@nexus/shared';

export class AuthUserDto implements AuthUser {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() name: string;
  @ApiProperty() email: string;
}

export class MembershipSummaryDto implements MembershipSummary {
  @ApiProperty({ format: 'uuid' }) organizationId: string;
  @ApiProperty() organizationName: string;
  @ApiProperty() organizationSlug: string;
  @ApiProperty({ enum: MEMBER_ROLES }) role: MemberRole;
}

export class ActiveOrganizationDto implements ActiveOrganization {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() name: string;
  @ApiProperty() slug: string;
  @ApiProperty({ enum: MEMBER_ROLES }) role: MemberRole;
  @ApiProperty({ enum: ALL_PERMISSIONS, isArray: true }) permissions: Permission[];
}

export class SessionInfoDto {
  @ApiProperty({ format: 'date-time' }) createdAt: string;
  @ApiProperty({ format: 'date-time' }) expiresAt: string;
}

export class MeResponseDto implements MeResponse {
  @ApiProperty({ type: AuthUserDto }) user: AuthUserDto;
  @ApiProperty({ type: MembershipSummaryDto, isArray: true }) memberships: MembershipSummaryDto[];
  @ApiProperty({ type: ActiveOrganizationDto, nullable: true })
  activeOrganization: ActiveOrganizationDto | null;
  @ApiProperty({ type: SessionInfoDto }) session: SessionInfoDto;
}

export class CsrfResponseDto implements CsrfResponse {
  @ApiProperty() csrfToken: string;
}

export class MessageResponseDto implements MessageResponse {
  @ApiProperty() message: string;
}
