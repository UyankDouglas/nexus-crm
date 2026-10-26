/**
 * Tarefas e atividades FICTÍCIAS para a seed de demonstração. Clientes e negócios são
 * referenciados pelas chaves de `demo-customers.ts` e pelos títulos de `demo-deals.ts`.
 * Datas relativas ao dia da execução: sempre há tarefas do dia, atrasadas e futuras.
 */
import type { DemoOwner } from './demo-customers';

type Member = Exclude<DemoOwner, null>;

export interface DemoTask {
  title: string;
  assignee: Member;
  /** Quem criou (padrão: o próprio responsável). */
  createdBy?: Member;
  customer?: string;
  deal?: string;
  /** Prazo em dias a partir de hoje (negativo = atrasada). */
  dueInDays: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status?: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELED';
  description?: string;
}

export interface DemoActivity {
  type: 'CALL' | 'MEETING' | 'EMAIL' | 'NOTE';
  subject: string;
  description?: string;
  customer: string;
  deal?: string;
  author: Member;
  daysAgo: number;
  /** Hora local (Brasília). */
  hour: number;
}

export const HORIZONTE_TASKS: DemoTask[] = [
  // Juliana
  { title: 'Enviar contrato revisado à Aurora', assignee: 'juliana', customer: 'aurora', deal: 'Contrato anual de abastecimento', dueInDays: 0, priority: 'HIGH', status: 'IN_PROGRESS', description: 'Incluir a cláusula de reajuste pedida pela diretoria financeira.' },
  { title: 'Retornar sobre o desconto da Lumen', assignee: 'juliana', customer: 'lumen', deal: 'Sistema de agendamento', dueInDays: -2, priority: 'HIGH', description: 'Cliente pediu 8% de desconto para fechar ainda este mês.' },
  { title: 'Agendar demonstração para a Nimbus', assignee: 'juliana', customer: 'nimbus', deal: 'Licenças Nimbus Enterprise', dueInDays: 2, priority: 'MEDIUM' },
  { title: 'Levantar volumes da linha sazonal', assignee: 'juliana', customer: 'gaia', deal: 'Linha de cosméticos sazonal', dueInDays: 5, priority: 'MEDIUM' },
  { title: 'Primeira ligação para a Cobalto', assignee: 'juliana', customer: 'cobalto', deal: 'Gestão de obras — piloto', dueInDays: 1, priority: 'LOW' },
  { title: 'Pesquisa de satisfação pós-venda', assignee: 'juliana', customer: 'gaia', dueInDays: -6, priority: 'LOW', status: 'DONE' },
  { title: 'Atualizar contatos da Raízes', assignee: 'juliana', customer: 'raizes', dueInDays: -3, priority: 'LOW', status: 'DONE' },
  // Rafael
  { title: 'Proposta técnica de automação', assignee: 'rafael', customer: 'belavista', deal: 'Automação da linha de produção', dueInDays: 4, priority: 'HIGH', status: 'IN_PROGRESS' },
  { title: 'Negociar prazo de entrega das embalagens', assignee: 'rafael', customer: 'belavista', deal: 'Fornecimento de embalagens', dueInDays: -1, priority: 'HIGH' },
  { title: 'Visita técnica à Solaris', assignee: 'rafael', customer: 'solaris', deal: 'Usina solar — estudo de viabilidade', dueInDays: 7, priority: 'MEDIUM', createdBy: 'carlos' },
  { title: 'Enviar catálogo de eventos', assignee: 'rafael', customer: 'orla', deal: 'Pacote de eventos 2027', dueInDays: 0, priority: 'MEDIUM' },
  { title: 'Reunião de reativação com a Farol', assignee: 'rafael', customer: 'farol', dueInDays: -10, priority: 'LOW', status: 'CANCELED' },
  // Carlos (gestor)
  { title: 'Aprovar condição especial da Delta', assignee: 'carlos', customer: 'delta', deal: 'Roteirização inteligente', dueInDays: 1, priority: 'HIGH' },
  { title: 'Distribuir os novos leads', assignee: 'carlos', dueInDays: 0, priority: 'MEDIUM', description: 'Estrela Têxtil e Kairós Educação aguardam responsável.' },
  { title: 'Revisar metas do trimestre com a equipe', assignee: 'carlos', dueInDays: 3, priority: 'MEDIUM' },
  { title: 'Fechar previsão de vendas do mês', assignee: 'carlos', dueInDays: -4, priority: 'MEDIUM', status: 'DONE' },
]; // prettier-ignore

export const VERTICE_TASKS: DemoTask[] = [
  { title: 'Enviar cotação da frota', assignee: 'beatriz', customer: 'atlas', deal: 'Seguro empresarial de frota', dueInDays: 1, priority: 'HIGH' },
  { title: 'Apresentar carteira PJ', assignee: 'carlos', customer: 'bussola', deal: 'Carteira de investimentos PJ', dueInDays: 3, priority: 'MEDIUM', createdBy: 'beatriz' },
  { title: 'Pós-venda do lançamento residencial', assignee: 'beatriz', customer: 'duna', dueInDays: -2, priority: 'LOW', status: 'DONE' },
]; // prettier-ignore

export const HORIZONTE_ACTIVITIES: DemoActivity[] = [
  { type: 'MEETING', subject: 'Reunião com a diretoria financeira', description: 'Aprovação condicionada à cláusula de reajuste anual.', customer: 'aurora', deal: 'Contrato anual de abastecimento', author: 'juliana', daysAgo: 1, hour: 10 },
  { type: 'EMAIL', subject: 'Proposta das 3 novas lojas enviada', customer: 'aurora', deal: 'Expansão para 3 novas lojas', author: 'juliana', daysAgo: 3, hour: 16 },
  { type: 'CALL', subject: 'Negociação de desconto', description: 'Pediram 8% para fechar este mês; vou consultar a gestão.', customer: 'lumen', deal: 'Sistema de agendamento', author: 'juliana', daysAgo: 4, hour: 11 },
  { type: 'NOTE', subject: 'Desconto máximo autorizado: 5%', description: 'Acima disso, só com contrato de 24 meses.', customer: 'lumen', deal: 'Sistema de agendamento', author: 'carlos', daysAgo: 3, hour: 9 },
  { type: 'CALL', subject: 'Qualificação da linha sazonal', customer: 'gaia', deal: 'Linha de cosméticos sazonal', author: 'juliana', daysAgo: 6, hour: 15 },
  { type: 'MEETING', subject: 'Kick-off da integração com e-commerce', customer: 'gaia', deal: 'Integração com e-commerce', author: 'juliana', daysAgo: 7, hour: 14 },
  { type: 'EMAIL', subject: 'Apresentação institucional enviada', customer: 'raizes', deal: 'Plano de assinatura de café', author: 'juliana', daysAgo: 2, hour: 9 },
  { type: 'CALL', subject: 'Retorno sobre o treinamento', description: 'Sem orçamento neste semestre; retomar em março.', customer: 'leticia', deal: 'Treinamento da equipe', author: 'juliana', daysAgo: 12, hour: 17 },
  { type: 'MEETING', subject: 'Demonstração do Nimbus Enterprise', customer: 'nimbus', deal: 'Licenças Nimbus Enterprise', author: 'juliana', daysAgo: 9, hour: 10 },
  { type: 'NOTE', subject: 'Preferem reuniões às terças pela manhã', customer: 'aurora', author: 'juliana', daysAgo: 20, hour: 18 },
  { type: 'CALL', subject: 'Conversa com o diretor industrial', customer: 'belavista', deal: 'Automação da linha de produção', author: 'rafael', daysAgo: 2, hour: 11 },
  { type: 'MEETING', subject: 'Visita à fábrica de Ribeirão Preto', description: 'Levantamento das três linhas de envase.', customer: 'belavista', deal: 'Automação da linha de produção', author: 'rafael', daysAgo: 8, hour: 9 },
  { type: 'EMAIL', subject: 'Contraproposta de prazo de entrega', customer: 'belavista', deal: 'Fornecimento de embalagens', author: 'rafael', daysAgo: 5, hour: 16 },
  { type: 'CALL', subject: 'Primeiro contato sobre eventos 2027', customer: 'orla', deal: 'Pacote de eventos 2027', author: 'rafael', daysAgo: 7, hour: 14 },
  { type: 'NOTE', subject: 'Cliente escolheu concorrente na reativação', customer: 'farol', deal: 'Reativação de contrato', author: 'rafael', daysAgo: 25, hour: 12 },
  { type: 'CALL', subject: 'Briefing do estudo de viabilidade', customer: 'solaris', deal: 'Usina solar — estudo de viabilidade', author: 'rafael', daysAgo: 1, hour: 15 },
  { type: 'MEETING', subject: 'Mapeamento das rotas atuais', customer: 'delta', deal: 'Roteirização inteligente', author: 'carlos', daysAgo: 4, hour: 10 },
  { type: 'CALL', subject: 'Confirmação da frota adicional', customer: 'delta', deal: 'Frota adicional', author: 'carlos', daysAgo: 3, hour: 17 },
  { type: 'EMAIL', subject: 'Proposta da expansão Centro-Oeste', customer: 'jatoba', deal: 'Expansão Centro-Oeste', author: 'carlos', daysAgo: 6, hour: 11 },
  { type: 'NOTE', subject: 'Preço foi o fator decisivo na perda', customer: 'quasar', deal: 'Link dedicado', author: 'carlos', daysAgo: 6, hour: 18 },
  { type: 'CALL', subject: 'Contato inicial — uniformes', customer: 'estrela', deal: 'Uniformes corporativos', author: 'carlos', daysAgo: 1, hour: 9 },
]; // prettier-ignore

export const VERTICE_ACTIVITIES: DemoActivity[] = [
  { type: 'MEETING', subject: 'Vistoria da frota', customer: 'atlas', deal: 'Seguro empresarial de frota', author: 'beatriz', daysAgo: 2, hour: 10 },
  { type: 'CALL', subject: 'Perfil de investimento do cliente', customer: 'bussola', deal: 'Carteira de investimentos PJ', author: 'carlos', daysAgo: 5, hour: 15 },
  { type: 'EMAIL', subject: 'Catálogo da coleção didática', customer: 'cordel', deal: 'Coleção didática 2027', author: 'carlos', daysAgo: 3, hour: 11 },
  { type: 'NOTE', subject: 'Entrega das chaves agendada', customer: 'duna', deal: 'Lançamento residencial', author: 'beatriz', daysAgo: 10, hour: 16 },
]; // prettier-ignore
