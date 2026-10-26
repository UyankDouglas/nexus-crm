import { createBrowserRouter } from 'react-router';
import { FullPageLoader } from '@/components/full-page-state';
import { AppLayout } from '@/layouts/app-layout';
import { AuthLayout } from '@/layouts/auth-layout';
import { paths } from '@/lib/navigation';
import { PageErrorBoundary, RouteErrorPage } from '@/pages/route-error-page';
import { GuestRoute, ProtectedRoute } from './route-guards';

export const router = createBrowserRouter([
  {
    errorElement: <RouteErrorPage />,
    hydrateFallbackElement: <FullPageLoader />,
    children: [
      {
        element: <GuestRoute />,
        children: [
          {
            element: <AuthLayout />,
            children: [
              {
                path: paths.login,
                lazy: async () => ({
                  Component: (await import('@/pages/auth/login-page')).LoginPage,
                }),
              },
              {
                path: paths.register,
                lazy: async () => ({
                  Component: (await import('@/pages/auth/register-page')).RegisterPage,
                }),
              },
              {
                path: paths.forgotPassword,
                lazy: async () => ({
                  Component: (await import('@/pages/auth/forgot-password-page')).ForgotPasswordPage,
                }),
              },
              {
                path: paths.resetPassword,
                lazy: async () => ({
                  Component: (await import('@/pages/auth/reset-password-page')).ResetPasswordPage,
                }),
              },
            ],
          },
        ],
      },
      {
        // Aceite de convite: acessível com ou sem sessão (o token do link basta).
        element: <AuthLayout />,
        children: [
          {
            path: paths.invitation,
            lazy: async () => ({
              Component: (await import('@/pages/auth/accept-invitation-page')).AcceptInvitationPage,
            }),
          },
        ],
      },
      {
        element: <ProtectedRoute requireOrganization={false} />,
        children: [
          {
            element: <AuthLayout />,
            children: [
              {
                path: paths.selectOrganization,
                lazy: async () => ({
                  Component: (await import('@/pages/auth/select-organization-page'))
                    .SelectOrganizationPage,
                }),
              },
            ],
          },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppLayout />,
            children: [
              {
                // Erros de uma tela aparecem dentro do layout, com a navegação disponível.
                errorElement: <PageErrorBoundary />,
                children: [
                  {
                    index: true,
                    lazy: async () => ({
                      Component: (await import('@/pages/app/dashboard-page')).DashboardPage,
                    }),
                  },
                  {
                    path: paths.customers,
                    lazy: async () => ({
                      Component: (await import('@/pages/app/customers-page')).CustomersPage,
                    }),
                  },
                  {
                    path: `${paths.customers}/:customerId`,
                    lazy: async () => ({
                      Component: (await import('@/pages/app/customer-detail-page'))
                        .CustomerDetailPage,
                    }),
                  },
                  {
                    path: paths.pipeline,
                    lazy: async () => ({
                      Component: (await import('@/pages/app/pipeline-page')).PipelinePage,
                    }),
                  },
                  {
                    path: paths.tasks,
                    lazy: async () => ({
                      Component: (await import('@/pages/app/tasks-page')).TasksPage,
                    }),
                  },
                  {
                    path: paths.reports,
                    lazy: async () => ({
                      Component: (await import('@/pages/app/reports-page')).ReportsPage,
                    }),
                  },
                  {
                    path: paths.settings,
                    lazy: async () => ({
                      Component: (await import('@/pages/app/settings-page')).SettingsPage,
                    }),
                  },
                  {
                    path: '*',
                    lazy: async () => ({
                      Component: (await import('@/pages/not-found-page')).NotFoundPage,
                    }),
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
]);
