import { ApiProperty } from '@nestjs/swagger';
import {
  MEMBER_ROLES,
  type AcceptInvitationResponse,
  type InvitationItem,
  type InvitationPreview,
  type MemberRole,
} from '@nexus/shared';
import { SummaryDto } from '../../tasks/dto/task-response.dto';

export class InvitationDto implements InvitationItem {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() email: string;
  @ApiProperty({ enum: MEMBER_ROLES }) role: MemberRole;
  @ApiProperty({ type: SummaryDto, nullable: true }) invitedBy: SummaryDto | null;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
  @ApiProperty({ format: 'date-time' }) expiresAt: string;
  @ApiProperty() expired: boolean;
}

export class InvitationPreviewDto implements InvitationPreview {
  @ApiProperty() organizationName: string;
  @ApiProperty() email: string;
  @ApiProperty({ enum: MEMBER_ROLES }) role: MemberRole;
  @ApiProperty({ nullable: true, type: String }) invitedBy: string | null;
  @ApiProperty({ format: 'date-time' }) expiresAt: string;
  @ApiProperty() accountExists: boolean;
}

export class AcceptInvitationResponseDto implements AcceptInvitationResponse {
  @ApiProperty({ format: 'uuid' }) organizationId: string;
  @ApiProperty() organizationName: string;
  @ApiProperty() accountCreated: boolean;
  @ApiProperty() signedIn: boolean;
}
