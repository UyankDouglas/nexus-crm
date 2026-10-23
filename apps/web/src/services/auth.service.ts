import type {
  ForgotPasswordInput,
  LoginInput,
  MeResponse,
  MessageResponse,
  RegisterInput,
  ResetPasswordInput,
} from '@nexus/shared';
import { apiClient } from './api-client';

export const authService = {
  me: (signal?: AbortSignal) => apiClient.get<MeResponse>('/auth/me', { signal }),
  login: (input: LoginInput) => apiClient.post<MeResponse>('/auth/login', input),
  register: (input: RegisterInput) => apiClient.post<MeResponse>('/auth/register', input),
  logout: () => apiClient.post<void>('/auth/logout'),
  switchOrganization: (organizationId: string) =>
    apiClient.post<MeResponse>('/auth/switch-organization', { organizationId }),
  forgotPassword: (input: ForgotPasswordInput) =>
    apiClient.post<MessageResponse>('/auth/forgot-password', input),
  resetPassword: (input: ResetPasswordInput) =>
    apiClient.post<MessageResponse>('/auth/reset-password', input),
};
