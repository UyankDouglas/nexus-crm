import { ChartNoAxesCombined, KanbanSquare, ShieldCheck } from 'lucide-react';
import { Outlet } from 'react-router';
import { Logo } from '@/components/brand/logo';

const highlights = [
  {
    icon: KanbanSquare,
    title: 'Funil visual e organizado',
    description: 'Acompanhe cada oportunidade da prospecção ao fechamento.',
  },
  {
    icon: ChartNoAxesCombined,
    title: 'Indicadores em tempo real',
    description: 'Conversão, receita e desempenho da equipe em um só lugar.',
  },
  {
    icon: ShieldCheck,
    title: 'Dados isolados e protegidos',
    description: 'Cada organização com seus próprios usuários e permissões.',
  },
];

export function AuthLayout() {
  return (
    <div className="grid min-h-svh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <aside className="relative hidden overflow-hidden bg-sidebar p-10 text-white lg:flex lg:flex-col">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_40rem_at_-10%_-20%,rgba(37,99,235,0.45),transparent_60%),radial-gradient(40rem_30rem_at_110%_120%,rgba(30,64,175,0.5),transparent_60%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:48px_48px] opacity-[0.07]"
        />
        <div className="relative">
          <Logo inverted />
        </div>
        <div className="relative my-auto max-w-md space-y-10">
          <div className="space-y-4">
            <h1 className="text-4xl leading-tight font-semibold tracking-tight text-balance">
              Gestão comercial completa para equipes que vendem mais.
            </h1>
            <p className="text-base text-slate-300">
              Clientes, oportunidades, tarefas e resultados da sua equipe de vendas em uma única
              plataforma.
            </p>
          </div>
          <ul className="space-y-5">
            {highlights.map((item) => (
              <li key={item.title} className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                  <item.icon className="size-5 text-blue-200" />
                </span>
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-slate-400">{item.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-slate-500">
          © {new Date().getFullYear()} NEXUS CRM. Projeto de portfólio.
        </p>
      </aside>

      <main className="flex flex-col px-4 py-8 sm:px-8">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm [&_[data-slot=button]]:h-10 [&_[data-slot=input-group]]:h-10 [&_[data-slot=input]]:h-10">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
