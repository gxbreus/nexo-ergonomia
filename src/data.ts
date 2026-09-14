export type CaseStatus = 'Concluído' | 'Em cadastro' | 'Desatualizado' | 'Desativado';
export type ConditionStatus = 'Ativa' | 'Em cadastro' | 'Desativada';

export const cases = [
  { id:'CAS-0248',name:'Ana Ribeiro',injury:'Síndrome do manguito rotador',cid:'M75.1',company:'Saúde Tech',activity:'Operação de empilhadeira',status:'Concluído' as CaseStatus,score:82 },
  { id:'CAS-0247',name:'Pedro Dias',injury:'Síndrome do túnel do carpo',cid:'G56.0',company:'UFLAniana',activity:'Digitação intensa',status:'Em cadastro' as CaseStatus,score:64 },
  { id:'CAS-0246',name:'Carla Mendes',injury:'Epicondilite lateral',cid:'M77.1',company:'Nova Safra',activity:'Separação de pedidos',status:'Concluído' as CaseStatus,score:76 },
  { id:'CAS-0245',name:'João Martins',injury:'Dor lombar baixa',cid:'M54.5',company:'Saúde Tech',activity:'Levantamento de caixas',status:'Desatualizado' as CaseStatus,score:91 },
  { id:'CAS-0244',name:'Mariana Costa',injury:'Tendinite de Aquiles',cid:'M76.6',company:'Logis Minas',activity:'Deslocamento de carga',status:'Concluído' as CaseStatus,score:71 },
];

export const companies = [
  { id:'EMP-018',name:'Saúde Tech',initials:'ST',total:15,complete:13,drafts:2,average:78,priority:3, sectors: [{ id:'ST-TI',name:'TI',caseIds:[] as string[] }, { id:'ST-OP',name:'Operações',caseIds:[] as string[] }] },
  { id:'EMP-017',name:'UFLAniana',initials:'UF',total:9,complete:7,drafts:2,average:66,priority:1, sectors: [{ id:'UF-TI',name:'TI',caseIds:[] as string[] }, { id:'UF-OP',name:'Operações',caseIds:[] as string[] }] },
  { id:'EMP-016',name:'Nova Safra',initials:'NS',total:7,complete:6,drafts:1,average:73,priority:2, sectors: [{ id:'NS-TI',name:'TI',caseIds:[] as string[] }, { id:'NS-OP',name:'Operações',caseIds:[] as string[] }] },
  { id:'EMP-015',name:'Logis Minas',initials:'LM',total:4,complete:4,drafts:0,average:59,priority:0, sectors: [{ id:'LM-TI',name:'TI',caseIds:[] as string[] }, { id:'LM-OP',name:'Operações',caseIds:[] as string[] }] },
].map((company) => ({
  ...company,
  sectors: [
    ...company.sectors,
    { id: `${company.id}-ADM`, name: 'Administrativo', caseIds: [] as string[] },
    { id: `${company.id}-FIN`, name: 'Financeiro', caseIds: [] as string[] },
  ],
}));

export const conditions = [
  { id:'CON-031',name:'Síndrome do túnel do carpo',type:'Doença',cid:'G56.0',region:'Punho e mão',side:'Bilateral',status:'Ativa' as ConditionStatus,cases:7 },
  { id:'CON-030',name:'Síndrome do manguito rotador',type:'Lesão',cid:'M75.1',region:'Ombro',side:'Esquerda',status:'Ativa' as ConditionStatus,cases:5 },
  { id:'CON-029',name:'Epicondilite lateral',type:'Doença',cid:'M77.1',region:'Cotovelo',side:'Direita',status:'Ativa' as ConditionStatus,cases:4 },
  { id:'CON-028',name:'Dor lombar baixa',type:'Lesão',cid:'M54.5',region:'Coluna lombar',side:'Central',status:'Em cadastro' as ConditionStatus,cases:3 },
  { id:'CON-027',name:'Tendinite de Aquiles',type:'Doença',cid:'M76.6',region:'Tornozelo',side:'Bilateral',status:'Desativada' as ConditionStatus,cases:2 },
];

export const dimensions = [
  { name:'Postura e movimentos',value:86 },
  { name:'Frequência e duração',value:72 },
  { name:'Coerência temporal',value:67 },
  { name:'Aplicação de força',value:58 },
  { name:'Confiabilidade',value:84 },
];
