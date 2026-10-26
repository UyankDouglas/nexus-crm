/**
 * Negócios FICTÍCIOS para a seed de demonstração, ligados aos clientes de `demo-customers.ts`.
 * Datas são relativas ao dia da execução, para o quadro sempre parecer "vivo".
 */
import type { DemoOwner } from './demo-customers';

export interface DemoDeal {
  title: string;
  /** Chave do cliente em demo-customers.ts. */
  customer: string;
  owner: DemoOwner;
  value: number;
  /** Nome da etapa atual no funil padrão. */
  stage: string;
  createdDaysAgo: number;
  /** Previsão de fechamento em dias a partir de hoje (negativo = atrasado). */
  expectedInDays?: number;
  /** Para negócios encerrados: há quantos dias foram fechados. */
  closedDaysAgo?: number;
  lostReason?: string;
  notes?: string;
}

export const HORIZONTE_DEALS: DemoDeal[] = [
  // Juliana
  { title: 'Contrato anual de abastecimento', customer: 'aurora', owner: 'juliana', value: 185000, stage: 'Negociação', createdDaysAgo: 48, expectedInDays: 12, notes: 'Aguardando aprovação da diretoria financeira.' },
  { title: 'Expansão para 3 novas lojas', customer: 'aurora', owner: 'juliana', value: 96000, stage: 'Proposta enviada', createdDaysAgo: 21, expectedInDays: 25 },
  { title: 'Linha de cosméticos sazonal', customer: 'gaia', owner: 'juliana', value: 42000, stage: 'Qualificação', createdDaysAgo: 14, expectedInDays: 40 },
  { title: 'Integração com e-commerce', customer: 'gaia', owner: 'juliana', value: 28500, stage: 'Ganho', createdDaysAgo: 55, closedDaysAgo: 8 },
  { title: 'Plano de assinatura de café', customer: 'raizes', owner: 'juliana', value: 18900, stage: 'Primeiro contato', createdDaysAgo: 6, expectedInDays: 30 },
  { title: 'Licenças Nimbus Enterprise', customer: 'nimbus', owner: 'juliana', value: 74000, stage: 'Proposta enviada', createdDaysAgo: 19, expectedInDays: 18 },
  { title: 'Sistema de agendamento', customer: 'lumen', owner: 'juliana', value: 56000, stage: 'Negociação', createdDaysAgo: 38, expectedInDays: -3, notes: 'Cliente pediu desconto de 8% para fechar ainda este mês.' },
  { title: 'Gestão de obras — piloto', customer: 'cobalto', owner: 'juliana', value: 22000, stage: 'Novo lead', createdDaysAgo: 4, expectedInDays: 60 },
  { title: 'Consultoria de compras', customer: 'marina', owner: 'juliana', value: 9800, stage: 'Ganho', createdDaysAgo: 46, closedDaysAgo: 20 },
  { title: 'Treinamento da equipe', customer: 'leticia', owner: 'juliana', value: 6500, stage: 'Perdido', createdDaysAgo: 30, closedDaysAgo: 12, lostReason: 'Sem orçamento no momento' },
  // Rafael
  { title: 'Fornecimento de embalagens', customer: 'belavista', owner: 'rafael', value: 132000, stage: 'Negociação', createdDaysAgo: 41, expectedInDays: 10 },
  { title: 'Automação da linha de produção', customer: 'belavista', owner: 'rafael', value: 210000, stage: 'Qualificação', createdDaysAgo: 16, expectedInDays: 75 },
  { title: 'Mobiliário corporativo', customer: 'ipe', owner: 'rafael', value: 38000, stage: 'Proposta enviada', createdDaysAgo: 18, expectedInDays: 21 },
  { title: 'Pacote de eventos 2027', customer: 'orla', owner: 'rafael', value: 64000, stage: 'Primeiro contato', createdDaysAgo: 8, expectedInDays: 50 },
  { title: 'Usina solar — estudo de viabilidade', customer: 'solaris', owner: 'rafael', value: 145000, stage: 'Novo lead', createdDaysAgo: 3, expectedInDays: 90 },
  { title: 'Reativação de contrato', customer: 'farol', owner: 'rafael', value: 15000, stage: 'Perdido', createdDaysAgo: 60, closedDaysAgo: 25, lostReason: 'Escolheu um concorrente' },
  { title: 'Consultoria industrial', customer: 'henrique', owner: 'rafael', value: 12000, stage: 'Primeiro contato', createdDaysAgo: 10, expectedInDays: 35 },
  // Carlos (gestor)
  { title: 'Roteirização inteligente', customer: 'delta', owner: 'carlos', value: 88000, stage: 'Negociação', createdDaysAgo: 33, expectedInDays: 5 },
  { title: 'Frota adicional', customer: 'delta', owner: 'carlos', value: 47000, stage: 'Ganho', createdDaysAgo: 40, closedDaysAgo: 3 },
  { title: 'Expansão Centro-Oeste', customer: 'jatoba', owner: 'carlos', value: 260000, stage: 'Proposta enviada', createdDaysAgo: 27, expectedInDays: 30 },
  { title: 'Link dedicado', customer: 'quasar', owner: 'carlos', value: 33000, stage: 'Perdido', createdDaysAgo: 35, closedDaysAgo: 6, lostReason: 'Preço acima do orçamento' },
  { title: 'Contrato de safra 2026', customer: 'jatoba', owner: 'carlos', value: 120000, stage: 'Ganho', createdDaysAgo: 150, closedDaysAgo: 95 },
  { title: 'Piloto de logística reversa', customer: 'delta', owner: 'carlos', value: 30000, stage: 'Ganho', createdDaysAgo: 110, closedDaysAgo: 70 },
  // Sem responsável (aguardando distribuição)
  { title: 'Uniformes corporativos', customer: 'estrela', owner: null, value: 25000, stage: 'Novo lead', createdDaysAgo: 2, expectedInDays: 45 },
  { title: 'Plataforma de ensino a distância', customer: 'kairos', owner: null, value: 52000, stage: 'Novo lead', createdDaysAgo: 4 },
]; // prettier-ignore

export const VERTICE_DEALS: DemoDeal[] = [
  { title: 'Seguro empresarial de frota', customer: 'atlas', owner: 'beatriz', value: 54000, stage: 'Negociação', createdDaysAgo: 26, expectedInDays: 9 },
  { title: 'Carteira de investimentos PJ', customer: 'bussola', owner: 'carlos', value: 120000, stage: 'Qualificação', createdDaysAgo: 12, expectedInDays: 45 },
  { title: 'Coleção didática 2027', customer: 'cordel', owner: 'carlos', value: 36000, stage: 'Proposta enviada', createdDaysAgo: 7, expectedInDays: 20 },
  { title: 'Lançamento residencial', customer: 'duna', owner: 'beatriz', value: 410000, stage: 'Ganho', createdDaysAgo: 70, closedDaysAgo: 15 },
]; // prettier-ignore

/**
 * Negócios encerrados ao longo do último ano: alimentam os gráficos de vendas e receita do
 * dashboard. Ficam fora do quadro (encerrados há mais de 30 dias), mas entram nos totais.
 */
export const HORIZONTE_PAST_DEALS: DemoDeal[] = [
  { title: 'Implantação do ERP — fase 1', customer: 'aurora', owner: 'juliana', value: 68000, stage: 'Ganho', createdDaysAgo: 380, closedDaysAgo: 335 },
  { title: 'Câmaras frias — manutenção anual', customer: 'mare', owner: 'rafael', value: 24000, stage: 'Ganho', createdDaysAgo: 350, closedDaysAgo: 310 },
  { title: 'Portal do cliente', customer: 'nimbus', owner: 'juliana', value: 39000, stage: 'Perdido', createdDaysAgo: 330, closedDaysAgo: 290, lostReason: 'Escolheu um concorrente' },
  { title: 'Rastreamento de frota', customer: 'delta', owner: 'carlos', value: 52000, stage: 'Ganho', createdDaysAgo: 310, closedDaysAgo: 268 },
  { title: 'Linha de embalagens recicláveis', customer: 'belavista', owner: 'rafael', value: 87000, stage: 'Ganho', createdDaysAgo: 290, closedDaysAgo: 245 },
  { title: 'Campanha de verão', customer: 'orla', owner: 'rafael', value: 18000, stage: 'Perdido', createdDaysAgo: 260, closedDaysAgo: 230, lostReason: 'Projeto adiado ou cancelado' },
  { title: 'Consultoria tributária', customer: 'farol', owner: 'rafael', value: 21000, stage: 'Ganho', createdDaysAgo: 245, closedDaysAgo: 212 },
  { title: 'Kit de boas-vindas para clientes', customer: 'gaia', owner: 'juliana', value: 15500, stage: 'Ganho', createdDaysAgo: 230, closedDaysAgo: 198 },
  { title: 'Monitoramento de silos', customer: 'jatoba', owner: 'carlos', value: 96000, stage: 'Ganho', createdDaysAgo: 220, closedDaysAgo: 181 },
  { title: 'Agenda on-line para consultórios', customer: 'lumen', owner: 'juliana', value: 27000, stage: 'Perdido', createdDaysAgo: 200, closedDaysAgo: 166, lostReason: 'Sem orçamento no momento' },
  { title: 'Showroom virtual', customer: 'ipe', owner: 'rafael', value: 33000, stage: 'Ganho', createdDaysAgo: 185, closedDaysAgo: 152 },
  { title: 'Treinamento de vendas consultivas', customer: 'marina', owner: 'juliana', value: 8200, stage: 'Ganho', createdDaysAgo: 160, closedDaysAgo: 131 },
  { title: 'Rede Wi-Fi corporativa', customer: 'quasar', owner: 'carlos', value: 44000, stage: 'Perdido', createdDaysAgo: 150, closedDaysAgo: 118, lostReason: 'Preço acima do orçamento' },
  { title: 'Cafeteria conceito', customer: 'raizes', owner: 'juliana', value: 36500, stage: 'Ganho', createdDaysAgo: 140, closedDaysAgo: 104 },
  { title: 'Eficiência energética — galpão', customer: 'solaris', owner: 'rafael', value: 58000, stage: 'Ganho', createdDaysAgo: 120, closedDaysAgo: 86 },
  { title: 'Suporte premium 24×7', customer: 'nimbus', owner: 'juliana', value: 49000, stage: 'Ganho', createdDaysAgo: 100, closedDaysAgo: 63 },
  { title: 'Reforma da sede', customer: 'cobalto', owner: 'juliana', value: 72000, stage: 'Perdido', createdDaysAgo: 90, closedDaysAgo: 52, lostReason: 'Necessidade não atendida' },
  { title: 'Armazenagem sazonal', customer: 'delta', owner: 'carlos', value: 41000, stage: 'Ganho', createdDaysAgo: 80, closedDaysAgo: 45 },
  { title: 'Assessoria de importação', customer: 'camila', owner: 'rafael', value: 12500, stage: 'Ganho', createdDaysAgo: 70, closedDaysAgo: 38 },
  { title: 'Inventário automatizado', customer: 'aurora', owner: 'juliana', value: 31000, stage: 'Ganho', createdDaysAgo: 60, closedDaysAgo: 33 },
]; // prettier-ignore
