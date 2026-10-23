import { createBrowserRouter } from 'react-router';
import { FullPageLoader } from '@/components/full-page-state';
import { AppLayout } from '@/layouts/app-layout';
import { AuthLayout } from '@/layouts/auth-layout';
import { mainNavigation, paths } from '@/lib/navigation';
import { RouteErrorPage } from '@/pages/route-error-page';
import { GuestRoute, ProtectedRoute } from './route-guards';

/** Módulos ainda não lançados usam a página de roadmap, sem simular funcionalidades. */
const upcomingRoutes = mainNavigation
  .filter((item) => item.upcoming)
  .map((item) => ({
    path: item.path,
    lazy: async () => {
      const { UpcomingModulePage } = await import('@/pages/app/upcoming-module-page');
      return { Component: () => <UpcomingModulePage item={item} /> };
    },
  }));

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
                  Component: (await import('@/pages/app/customer-detail-page')).CustomerDetailPage,
                }),
              },
              ...upcomingRoutes,
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
]);
