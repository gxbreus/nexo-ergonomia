import type { CaseWorkflowRecord, CaseWorkflowState } from "./CaseWorkflow";
import type { CompanyWorkflowRecord } from "./CompanyWorkflow";
import type { ConditionWorkflowRecord } from "./ConditionWorkflow";
import type { AnswerValue } from "./workflowData";

type MockCase = Omit<CaseWorkflowRecord, "workflow" | "indexPending"> & {
  sector: string;
  region: string;
  regionCode: string;
  side: "Direito" | "Esquerdo" | "Ambos" | "Central";
  structures: string[];
  movements: string[];
  activityStart: string;
  symptomStart: string;
  workloadChange: string;
  customQuestionId: string;
};

const activityAnswers = (item: MockCase): Record<string, AnswerValue> => ({
  AT01: item.activityStart,
  AT01_APPROXIMATE: "Não",
  AT02: "Ainda realiza",
  AT02_APPROXIMATE: "Não",
  AT03: "5",
  AT03_UNIT: "dias por semana",
  AT04: "24",
  AT04_UNIT: "execuções por jornada",
  AT05: "12",
  AT05_UNIT: "Minutos",
  AT06: "6",
  AT07: "Sim",
  AT07_DURATION: "10",
  AT07_DURATION_UNIT: "Minutos",
  AT07_FREQUENCY: "2",
  AT07_FREQUENCY_UNIT: "Pausas por jornada",
  AT08: "Sim",
  AT09: [item.region],
  [`AT10_${item.regionCode}`]: item.side,
  [`AT11_${item.regionCode}`]: item.movements,
  AT12: "Sim",
  [`AT13_${item.regionCode}`]: [
    item.region.includes("lombar") ? "Tronco flexionado" : "Braços elevados",
  ],
  AT14: "18",
  AT14_UNIT: "Minutos",
  AT15: "Sim",
  [`AT16_${item.regionCode}`]: item.movements.slice(0, 2),
  AT17: "12",
  AT17_UNIT: "Por minuto",
  AT18: "Sim",
  AT19: ["Levantar", "Carregar", "Segurar"],
  AT20: "8",
  AT20_UNIT: "Quilogramas",
  AT21: "16",
  AT21_UNIT: "Por jornada",
  AT22: "Duas",
  AT23: "Às vezes",
  AT24: "Não",
  AT26: "Aumentou",
  AT27: ["Frequência", "Duração", "Postura"],
  AT28: item.workloadChange,
  AT28_APPROXIMATE: "Sim",
});

const conditionAnswers = (item: MockCase): Record<string, AnswerValue> => ({
  COND01: "Doença/distúrbio musculoesquelético",
  COND02: "Sim",
  COND03: item.injury,
  COND04: [item.region],
  [`COND05_${item.regionCode}`]: item.side,
  [`COND06_${item.regionCode}`]: item.structures,
  [`COND07_${item.regionCode}`]: item.movements,
  COND08: item.symptomStart,
  COND08_APPROXIMATE: "Não",
  COND09: "Gradual",
  COND10: item.activity,
  COND11: "Durante",
  COND12: "Parcialmente",
  COND13: "Sim",
  [`CUSTOM_${item.customQuestionId}`]: "Sim",
  PROFILE_CONFIRM: "Sim",
});

const timelineAnswers = (): Record<string, AnswerValue> => ({
  LT03: "Sim",
  LT04: "3",
  LT04_UNIT: "Semanas",
  LT05: "Sim",
  LT06: "15",
  LT06_UNIT: "Dias",
  LT07: "Melhoraram",
  LT08: "Sim",
  LT09: "Pioraram",
  LT10: "Dias",
  LT12: "Não",
});

const workflow = (item: MockCase): CaseWorkflowState => {
  const conditionId = `condition-${item.id.toLowerCase()}`;
  const activityId = `activity-${item.id.toLowerCase()}`;
  return {
    name: item.name,
    disease: item.injury,
    associatedCompany: true,
    company: item.company,
    associatedSector: true,
    sector: item.sector,
    conditions: [{ id: conditionId, answers: conditionAnswers(item) }],
    activities: [
      { id: activityId, name: item.activity, answers: activityAnswers(item) },
    ],
    timelineAnswers: {
      [`${conditionId}::${activityId}`]: timelineAnswers(),
    },
  };
};

const mockCases: MockCase[] = [
  {
    id: "CAS-0248",
    name: "Ana Ribeiro",
    injury: "Tendinopatia do manguito rotador",
    cid: "M75.1",
    company: "Saúde Tech",
    sector: "Operações",
    activity: "Operação de empilhadeira",
    status: "Concluído",
    score: 0,
    region: "Ombro",
    regionCode: "RC04",
    side: "Esquerdo",
    structures: ["Tendão"],
    movements: ["Elevação do braço", "Abdução", "Alcance acima do ombro"],
    activityStart: "2021-02-08",
    symptomStart: "2023-06-14",
    workloadChange: "2023-04-03",
    customQuestionId: "PERG-TMR-01",
  },
  {
    id: "CAS-0247",
    name: "Pedro Dias",
    injury: "Síndrome do túnel do carpo",
    cid: "G56.0",
    company: "UFLAniana",
    sector: "Tecnologia da Informação",
    activity: "Digitação intensa",
    status: "Em cadastro",
    score: 0,
    region: "Punho",
    regionCode: "RC08",
    side: "Ambos",
    structures: ["Nervo"],
    movements: ["Flexão", "Extensão", "Digitação"],
    activityStart: "2020-08-17",
    symptomStart: "2024-01-22",
    workloadChange: "2023-11-06",
    customQuestionId: "PERG-STC-01",
  },
  {
    id: "CAS-0246",
    name: "Carla Mendes",
    injury: "Epicondilite lateral",
    cid: "M77.1",
    company: "Nova Safra",
    sector: "Expedição",
    activity: "Separação de pedidos",
    status: "Concluído",
    score: 0,
    region: "Cotovelo",
    regionCode: "RC06",
    side: "Direito",
    structures: ["Tendão"],
    movements: ["Extensão", "Preensão", "Pronação"],
    activityStart: "2022-03-14",
    symptomStart: "2024-02-05",
    workloadChange: "2023-12-11",
    customQuestionId: "PERG-EL-01",
  },
  {
    id: "CAS-0245",
    name: "João Martins",
    injury: "Hérnia ou transtorno de disco lombar",
    cid: "M51.1",
    company: "Saúde Tech",
    sector: "Logística",
    activity: "Levantamento de caixas",
    status: "Desatualizado",
    score: 0,
    region: "Região lombar/lombossacral",
    regionCode: "RC03",
    side: "Central",
    structures: ["Disco", "Nervo"],
    movements: ["Flexão", "Rotação", "Levantamento"],
    activityStart: "2019-05-20",
    symptomStart: "2022-09-12",
    workloadChange: "2022-07-04",
    customQuestionId: "PERG-HDL-01",
  },
  {
    id: "CAS-0244",
    name: "Mariana Costa",
    injury: "Tendinopatia do tendão de Aquiles",
    cid: "M76.6",
    company: "Logis Minas",
    sector: "Armazém",
    activity: "Deslocamento de carga",
    status: "Concluído",
    score: 0,
    region: "Tornozelo",
    regionCode: "RC15",
    side: "Ambos",
    structures: ["Tendão"],
    movements: ["Caminhada", "Permanência em pé"],
    activityStart: "2021-10-01",
    symptomStart: "2023-08-18",
    workloadChange: "2023-05-15",
    customQuestionId: "PERG-TA-01",
  },
  {
    id: "CAS-0243",
    name: "Luiza Melo",
    injury: "Distensão musculoligamentar lombar",
    cid: "S39.0",
    company: "Nova Safra",
    sector: "Produção",
    activity: "Montagem de kits",
    status: "Concluído",
    score: 0,
    region: "Região lombar/lombossacral",
    regionCode: "RC03",
    side: "Central",
    structures: ["Músculo", "Ligamento"],
    movements: ["Flexão", "Rotação", "Levantamento"],
    activityStart: "2022-06-06",
    symptomStart: "2024-03-11",
    workloadChange: "2024-01-08",
    customQuestionId: "PERG-DML-01",
  },
];

export const demoCases: CaseWorkflowRecord[] = mockCases.map((item) => ({
  id: item.id,
  name: item.name,
  injury: item.injury,
  cid: item.cid,
  company: item.company,
  sector: item.sector,
  activity: item.activity,
  status: item.status,
  score: 0,
  indexPending: item.status === "Concluído",
  workflow: workflow(item),
}));

const linkedCases = (company: string, sector: string) =>
  demoCases
    .filter((item) => item.company === company && item.sector === sector)
    .map((item) => item.id);

const sectors = (company: string, names: string[]) =>
  names.map((name, index) => ({
    id: `${company.slice(0, 3).toUpperCase()}-${index + 1}`,
    name,
    caseIds: linkedCases(company, name),
  }));

export const demoCompanies: CompanyWorkflowRecord[] = [
  {
    id: "EMP-018",
    name: "Saúde Tech",
    initials: "ST",
    total: 2,
    complete: 1,
    drafts: 0,
    average: 0,
    priority: 0,
    sectors: sectors("Saúde Tech", ["Operações", "Logística", "Administrativo"]),
  },
  {
    id: "EMP-017",
    name: "UFLAniana",
    initials: "UF",
    total: 1,
    complete: 0,
    drafts: 1,
    average: 0,
    priority: 0,
    sectors: sectors("UFLAniana", [
      "Tecnologia da Informação",
      "Atendimento",
      "Manutenção",
    ]),
  },
  {
    id: "EMP-016",
    name: "Nova Safra",
    initials: "NS",
    total: 2,
    complete: 2,
    drafts: 0,
    average: 0,
    priority: 0,
    sectors: sectors("Nova Safra", ["Expedição", "Produção", "Qualidade"]),
  },
  {
    id: "EMP-015",
    name: "Logis Minas",
    initials: "LM",
    total: 1,
    complete: 1,
    drafts: 0,
    average: 0,
    priority: 0,
    sectors: sectors("Logis Minas", ["Armazém", "Transporte", "Conferência"]),
  },
];

const additionalQuestion = (id: string, title: string) => ({
  id,
  title,
  type: "Seleção simples" as const,
  weight: 15,
  options: [
    { id: `${id}-1`, label: "Sim", weight: 100 },
    { id: `${id}-2`, label: "Parcialmente", weight: 50 },
    { id: `${id}-3`, label: "Não", weight: 0 },
  ],
});

const condition = (
  id: string,
  name: string,
  type: "Doença" | "Lesão",
  cid: string,
  regions: { name: string; side: string }[],
  questionId: string,
  questionTitle: string,
  status: ConditionWorkflowRecord["status"] = "Ativa",
): ConditionWorkflowRecord => ({
  id,
  name,
  type,
  cid,
  region: regions.map((item) => item.name).join(", "),
  side: [...new Set(regions.map((item) => item.side))].join(", "),
  status,
  cases: demoCases.filter((item) => item.injury === name).length,
  revision: "CID-10",
  release: "2021",
  regions,
  questions: [additionalQuestion(questionId, questionTitle)],
  updatedAt: "15/09/2026 14:30",
  responsible: "Gabriel Soares",
});

export const demoConditions: ConditionWorkflowRecord[] = [
  condition(
    "CON-031",
    "Síndrome do túnel do carpo",
    "Doença",
    "G56.0",
    [
      { name: "Punho", side: "Ambos" },
      { name: "Mão", side: "Ambos" },
    ],
    "PERG-STC-01",
    "Há piora dos sintomas durante a digitação?",
  ),
  condition(
    "CON-030",
    "Tendinopatia do manguito rotador",
    "Doença",
    "M75.1",
    [{ name: "Ombro", side: "Esquerdo" }],
    "PERG-TMR-01",
    "O trabalho exige alcance acima dos ombros?",
  ),
  condition(
    "CON-029",
    "Epicondilite lateral",
    "Doença",
    "M77.1",
    [{ name: "Cotovelo", side: "Direito" }],
    "PERG-EL-01",
    "Há preensão manual repetitiva na atividade?",
  ),
  condition(
    "CON-028",
    "Hérnia ou transtorno de disco lombar",
    "Doença",
    "M51.1",
    [{ name: "Região lombar/lombossacral", side: "Central" }],
    "PERG-HDL-01",
    "A atividade envolve flexão de tronco com carga?",
    "Em cadastro",
  ),
  condition(
    "CON-027",
    "Tendinopatia do tendão de Aquiles",
    "Doença",
    "M76.6",
    [{ name: "Tornozelo", side: "Ambos" }],
    "PERG-TA-01",
    "Há longos períodos de caminhada ou permanência em pé?",
  ),
  condition(
    "CON-026",
    "Distensão musculoligamentar lombar",
    "Lesão",
    "S39.0",
    [{ name: "Região lombar/lombossacral", side: "Central" }],
    "PERG-DML-01",
    "Houve esforço súbito durante o início dos sintomas?",
  ),
];

export const demoDimensions = [
  "Frequência e duração",
  "Postura e movimentos",
  "Aplicação de força",
  "Coerência temporal",
  "Confiabilidade",
].map((name) => ({ name, value: 0 }));
