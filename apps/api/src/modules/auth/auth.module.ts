import { Module } from '@nestjs/common';
import { OrganizationsModule } from '../organizations/organizations.module';
import { AuthCookiesService } from './auth-cookies.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CsrfService } from './csrf.service';
import { PasswordHasherService } from './password-hasher.service';
import { SessionsService } from './sessions.service';

@Module({
  imports: [OrganizationsModule],
  controllers: [AuthController],
  providers: [AuthService, AuthCookiesService, CsrfService, PasswordHasherService, SessionsService],
  exports: [AuthCookiesService, CsrfService, PasswordHasherService, SessionsService],
})
export class AuthModule {}
