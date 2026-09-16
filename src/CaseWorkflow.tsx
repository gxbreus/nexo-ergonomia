import { isValidElement, useEffect, useState, type ReactNode } from "react";
import { regionData } from './regionData';
import { catalogProfiles } from './catalogProfiles';
import { SearchableSelect } from './SearchableSelect';
import { companyActivities, unlinkedActivities } from './activityData';
import {
  Activity,
  Building2,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import {
  activityQuestions,
  conditionQuestions,
  sectorsByCompany,
  timelineQuestions,
  type AnswerValue,
  type WorkflowQuestion,
} from "./workflowData";

export type CaseWorkflowRecord = {
  id: string;
  name: string;
  injury: string;
  cid: string;
  company: string;
  sector?: string;
  activity: string;
  status: "Concluído" | "Em cadastro" | "Desatualizado" | "Desativado";
  score: number;
  indexPending?: boolean;
  workflow?: CaseWorkflowState;
};

type SimpleEntity = { id: string; name: string; sectors?: { id: string; name: string }[] };
type ConditionEntity = SimpleEntity & { cid: string; status: string; questions?: { id: string; title: string; type: string; options: { label: string }[] }[] };
type ActivityEntry = {
  id: string;
  name: string;
  other?: boolean;
  answers: Record<string, AnswerValue>;
};
type ConditionEntry = { id: string; answers: Record<string, AnswerValue> };
type Step = "identification" | "condition" | "activity" | "timeline";

export type CaseWorkflowState = {
  name: string;
  disease?: string;
  associatedCompany: boolean;
  company: string;
  associatedSector: boolean;
  isOtherSector: boolean;
  sector: string;
  conditions: ConditionEntry[];
  activities: ActivityEntry[];
  timelineAnswers: Record<string, Record<string, AnswerValue>>;
};

function emptyState(item?: CaseWorkflowRecord): CaseWorkflowState {
  if (item?.workflow) return { ...item.workflow, disease: item.workflow.disease ?? item.injury, isOtherSector: item.workflow.isOtherSector ?? false, conditions: item.workflow.conditions.slice(0, 1) };
  return {
    name: item?.name ?? "",
    disease: item?.injury ?? '',
    associatedCompany: Boolean(item?.company),
    company: item?.company ?? "",
    associatedSector: Boolean(item?.sector),
    isOtherSector: false,
    sector: item?.sector ?? "",
    conditions: [
      {
        id: "condition-1",
        answers: item?.injury ? { COND02: "Sim", COND03: item.injury } : {},
      },
    ],
    activities: [
      { id: "activity-1", name: item?.activity ?? "", answers: { AT06: "4" } },
    ],
    timelineAnswers: {},
  };
}

export function CaseWorkflow({
  item,
  mode,
  companies,
  conditions,
  existingCodes,
  onSave,
}: {
  item?: CaseWorkflowRecord;
  mode: "create" | "edit" | "view";
  companies: SimpleEntity[];
  conditions: ConditionEntity[];
  existingCodes: string[];
  onSave: (item: CaseWorkflowRecord) => void;
}) {
  const readOnly = mode === "view";
  const draftKey = item ? `nexo-case-v2-${item.id}` : "nexo-new-case-draft-v2";
  const [step, setStep] = useState<Step>("identification");
  const [state, setState] = useState<CaseWorkflowState>(() => {
    if (!readOnly && typeof window !== "undefined") {
      const stored = window.sessionStorage.getItem(draftKey);
      if (stored) { const restored = JSON.parse(stored) as CaseWorkflowState; return { ...restored, disease: restored.disease ?? item?.injury ?? '', isOtherSector: restored.isOtherSector ?? false, conditions: restored.conditions.slice(0, 1) }; }
    }
    return emptyState(item);
  });
  const [savedAt, setSavedAt] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (readOnly) return;
    window.sessionStorage.setItem(draftKey, JSON.stringify(state));
    setSavedAt(
      new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    );
  }, [draftKey, readOnly, state]);

  const activityOptions =
    state.associatedCompany && state.company
      ? (companyActivities[state.company] ?? [])
      : unlinkedActivities;
  const sectors =
    state.associatedCompany && state.company
      ? (companies.find((company) => company.name === state.company)?.sectors?.map((sector) => sector.name) ?? sectorsByCompany[state.company] ?? [])
      : [];
  const sectorOptions = [
    ...sectors.map((name) => ({ value: name, label: name })),
    {
      value: "__other_sector__",
      label: "Outro setor",
      description: "Informar manualmente para este caso",
    },
  ];
  const activityHours = (activity: ActivityEntry) =>
    Number(activity.answers.AT06 || 0);
  const maxHours = Math.max(...state.activities.map(activityHours), 0);
  const patch = (values: Partial<CaseWorkflowState>) =>
    setState((current) => ({ ...current, ...values }));
  const patchCondition = (id: string, answers: Record<string, AnswerValue>) =>
    patch({
      conditions: state.conditions.map((entry) =>
        entry.id === id ? { ...entry, answers } : entry,
      ),
    });
  const patchActivity = (id: string, values: Partial<ActivityEntry>) =>
    patch({
      activities: state.activities.map((entry) =>
        entry.id === id ? { ...entry, ...values } : entry,
      ),
    });

  const validate = () => {
    const nextErrors: string[] = [];
    if (!state.name.trim()) nextErrors.push("Informe o nome do trabalhador.");
    if (!(state.disease ?? '').trim()) nextErrors.push('Selecione ou informe a doença alegada.');
    if (state.conditions.some((entry) => entry.answers.PROFILE_CONFIRM === 'Não')) nextErrors.push('Confira e confirme os dados pré-preenchidos pelo catálogo.');
    if (state.associatedCompany && !state.company)
      nextErrors.push("Selecione a empresa associada.");
    if (state.associatedSector && !state.sector)
      nextErrors.push(state.isOtherSector ? "Informe qual é o setor." : "Selecione o setor da empresa.");
    if (state.conditions.some((entry) => entry.answers.COND02 === 'Sim' && !entry.answers.COND03))
      nextErrors.push('Selecione o diagnóstico específico de cada condição marcada como diagnosticada.');
    if (state.activities.some((entry) => entry.answers.AT02 !== 'Ainda realiza' && entry.answers.AT01 && entry.answers.AT02 && String(entry.answers.AT02) < String(entry.answers.AT01)))
      nextErrors.push('A data de término da atividade não pode anteceder seu início.');
    if (
      !state.conditions.length ||
      !state.conditions.every(
        (entry) =>
          entry.answers.COND01 &&
          entry.answers.COND02 &&
          Array.isArray(entry.answers.COND04) &&
          entry.answers.COND04.length,
      )
    )
      nextErrors.push(
        "Complete os dados obrigatórios de cada condição alegada.",
      );
    if (
      !state.activities.length ||
      !state.activities.every(
        (entry) =>
          entry.name &&
          entry.answers.AT01 &&
          entry.answers.AT03 &&
          entry.answers.AT06,
      )
    )
      nextErrors.push("Complete os dados obrigatórios de cada atividade.");
    setErrors(nextErrors);
    return nextErrors.length === 0;
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null;
    const draft = submitter?.value === "draft" || submitter?.value === "true";
    if (!draft && !validate()) return;
    const conditionName = state.disease ?? '';
    const cid =
      conditions.find((entry) => entry.name === conditionName)?.cid ?? "";
    const principals = state.activities
      .filter((entry) => activityHours(entry) === maxHours)
      .map((entry) => entry.name)
      .join(", ");
    // US01 leaves the percentage formula as XYZ/XXX.
    const score = 0;
    window.sessionStorage.removeItem(draftKey);
    const prefix = (state.associatedCompany ? state.company : 'SEM').slice(0, 3).toUpperCase();
    const sequence = Math.max(0, ...existingCodes.filter((code) => code.startsWith(`${prefix}-`)).map((code) => Number(code.slice(prefix.length + 1)) || 0)) + 1;
    onSave({
      id:
        item?.id ??
        `${prefix}-${String(sequence).padStart(3, '0')}`,
      name: state.name.trim(),
      injury: conditionName,
      cid,
      company: state.associatedCompany ? state.company : "",
      sector: state.associatedSector ? state.sector.trim() : "",
      activity: principals,
      status: draft ? "Em cadastro" : "Concluído",
      score,
      indexPending: true,
      workflow: state,
    });
  };

  return (
    <form id="cases-form" onSubmit={submit}>
      <div className="workflow-stepper">
        {(
          [
            ["identification", "1", "Identificação"],
            ["condition", "2", "Doença alegada"],
            ["activity", "3", "Atividade realizada"],
            ["timeline", "4", "Linha do tempo"],
          ] as const
        ).map(([id, number, label]) => (
          <button
            type="button"
            key={id}
            className={step === id ? "active" : ""}
            aria-current={step === id ? "step" : undefined}
            onClick={() => setStep(id)}
          >
            <span>{number}</span>
            {label}
          </button>
        ))}
      </div>
      {!readOnly && (
        <div className="autosave">
          <Save size={13} />
          <span>
            Rascunho salvo automaticamente nesta sessão
            {savedAt ? ` às ${savedAt}` : ""}.
          </span>
        </div>
      )}
      {errors.length > 0 && (
        <div className="validation-summary">
          <strong>Revise antes de concluir:</strong>
          {errors.map((error) => (
            <span key={error}>• {error}</span>
          ))}
        </div>
      )}

      {step === "identification" && (
        <section className="form-section">
          <SectionTitle
            icon={<ClipboardList size={17} />}
            title="Informações básicas"
            text="Identificação e vínculos organizacionais do caso."
          />
          {item && <div className="case-identifiers"><div><small>Código do caso</small><strong>{item.id}</strong></div><div><small>Situação do cadastro</small><strong>{item.status}</strong></div></div>}
          <Field label="Nome do trabalhador" required>
            <input
              disabled={readOnly}
              maxLength={255}
              value={state.name}
              onChange={(event) => patch({ name: event.target.value })}
              placeholder="Nome completo"
            />
          </Field>
          <Toggle
            label="Esse caso é associado a alguma empresa?"
            value={state.associatedCompany}
            disabled={readOnly}
            onChange={() =>
              patch({
                associatedCompany: !state.associatedCompany,
                company: "",
                associatedSector: false,
                isOtherSector: false,
                sector: "",
                activities: state.activities.map((entry) => ({
                  ...entry,
                  name: "",
                })),
              })
            }
          />
          {state.associatedCompany && (
            <div className="conditional-block">
              <p className="condition-label">
                DISPONÍVEL PORQUE O CASO É ASSOCIADO A UMA EMPRESA
              </p>
              <Field label="Empresa associada" required>
                <SearchableSelect label="Empresa associada" options={companies.map((entry) => ({ value: entry.name, label: entry.name }))} disabled={readOnly} value={state.company} onChange={(values) =>
                    patch({
                      company: values[0] ?? '',
                      associatedSector: false,
                      isOtherSector: false,
                      sector: "",
                      activities: state.activities.map((entry) => ({
                        ...entry,
                        name: "",
                      })),
                    })
                  } placeholder="Pesquisar empresa" />
              </Field>
              {state.company && <>
              <Toggle
                label="Esse caso é associado a algum setor?"
                value={state.associatedSector}
                disabled={readOnly}
                onChange={() =>
                  patch({
                    associatedSector: !state.associatedSector,
                    isOtherSector: false,
                    sector: "",
                  })
                }
              />
              {state.associatedSector && (
                <>
                  <Field label="Setor da empresa" required>
                    <SearchableSelect label="Setor da empresa" options={sectorOptions}
                      disabled={readOnly || !state.company}
                      allowCustom={false}
                      value={state.isOtherSector ? "__other_sector__" : state.sector}
                      onChange={(values) => {
                        const sector = values[0] ?? '';
                        patch(
                          sector === "__other_sector__"
                            ? { isOtherSector: true, sector: "" }
                            : { isOtherSector: false, sector },
                        );
                      }} placeholder="Pesquisar setor" />
                  </Field>
                  {state.isOtherSector && (
                    <Field label="Qual é o setor?" required>
                      <input
                        aria-describedby="other-sector-help"
                        disabled={readOnly}
                        maxLength={255}
                        onChange={(event) => patch({ sector: event.target.value })}
                        placeholder="Ex.: Laboratório de protótipos"
                        value={state.sector}
                      />
                      <small className="field-helper" id="other-sector-help">
                        Esse nome será salvo neste caso e não altera o catálogo da empresa.
                      </small>
                    </Field>
                  )}
                </>
              )}
              </>}
            </div>
          )}
          <div className="step-actions">
            <button
              type="button"
              className="primary-button"
              onClick={() => setStep("condition")}
            >
              Continuar para doença
            </button>
          </div>
        </section>
      )}

      {step === "condition" && (
        <section className="form-section">
          <SectionTitle
            icon={<Activity size={17} />}
            title="Doença alegada"
            text="Selecione a doença cadastrada e preencha seu questionário."
          />
          <Field label="Doença alegada" required>
            <SearchableSelect label="Doença alegada" options={conditions.filter((entry) => entry.status === 'Ativa' || readOnly && entry.name === state.disease).map((entry) => ({ value: entry.name, label: entry.name, description: entry.cid }))} value={state.disease ?? ''} disabled={readOnly} placeholder="Pesquisar doença por nome ou CID" onChange={(values) => {
              const disease = values[0] ?? '';
              const profile = catalogProfiles.find((entry) => entry.name === disease);
              const entry = state.conditions[0];
              const answers: Record<string, AnswerValue> = { ...entry.answers, COND03: disease };
              Object.keys(answers).filter((key) => key.startsWith('CUSTOM_') || /^COND0[567]_RC/.test(key)).forEach((key) => delete answers[key]);
              delete answers.PROFILE_CONFIRM;
              if (profile) {
                answers.COND01 = profile.nature;
                answers.COND04 = regionData.filter((region) => profile.regions.includes(region.code)).map((region) => region.name);
                for (const code of profile.regions) { answers[`COND06_${code}`] = profile.structures.map((structure) => structure[0].toUpperCase() + structure.slice(1)); answers[`COND07_${code}`] = profile.movements; }
                answers.PROFILE_CONFIRM = 'Não';
              }
              patch({ disease, conditions: [{ ...entry, answers }] });
            }} />
          </Field>
          {state.conditions.slice(0, 1).map((entry) => (
            <div className="workflow-instance" key={entry.id}>
              <InstanceHeader
                title="Questionário da doença alegada"
              />
              <Questionnaire
                questions={[
                  ...conditionQuestions.filter((question) => question.id !== "COND10" || state.activities.some((activity) => activity.name)).map((question) => question.id === "COND10" ? { ...question, options: [...state.activities.filter((activity) => activity.name).map((activity) => activity.name), "Nenhuma", "Não sabe"] } : question.id === "COND03" ? { ...question, options: [...new Set([...(question.options ?? []).filter((name) => !conditions.some((condition) => condition.name === name && condition.status !== "Ativa")), ...conditions.filter((condition) => condition.status === "Ativa").map((condition) => condition.name)])] } : question),
                  ...(conditions.find((condition) => condition.name === state.disease)?.questions ?? []).map((question): WorkflowQuestion => ({ id: `CUSTOM_${question.id}`, dimension: "Perguntas adicionais", title: question.title, type: question.type === "Valor numérico" ? "number" : question.type === "Seleção múltipla" ? "multi" : "select", options: question.options.map((option) => option.label) })),
                ]}
                answers={entry.answers}
                context={{ LT05: "Sim", LT08: Object.entries(state.timelineAnswers).some(([key, answers]) => key.startsWith(`${entry.id}::`) && answers.LT05 === "Sim" && answers.LT08 === "Sim") ? "Sim" : "Não" }}
                disabled={readOnly}
                onChange={(answers) => patchCondition(entry.id, answers)}
              />
            </div>
          ))}
          <div className="step-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setStep("identification")}
            >
              Voltar
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => setStep("activity")}
            >
              Continuar para atividades
            </button>
          </div>
        </section>
      )}

      {step === "activity" && (
        <section className="form-section">
          <SectionTitle
            icon={<Building2 size={17} />}
            title="Atividade realizada"
            text="Uma aplicação completa do questionário para cada atividade."
          />
          {!state.company && state.associatedCompany && (
            <div className="inline-warning">
              Selecione a empresa para liberar as atividades vinculadas a ela.
            </div>
          )}
          {state.activities.map((entry, index) => (
            <div className="workflow-instance" key={entry.id}>
              <InstanceHeader
                title={`Atividade ${index + 1}`}
                badge={
                  activityHours(entry) === maxHours && entry.name
                    ? "Atividade principal"
                    : undefined
                }
                onRemove={
                  !readOnly && state.activities.length > 1
                    ? () =>
                        patch({
                          activities: state.activities.filter(
                            (activity) => activity.id !== entry.id,
                          ),
                        })
                    : undefined
                }
              />
              <Field label="Selecionar atividade" required>
                <SearchableSelect label={`Atividade ${index + 1}`} options={[...activityOptions.map((name) => ({ value: name, label: name })), { value: '__other__', label: 'Outros', description: 'Informar uma atividade não cadastrada' }]}
                  allowCustom={false}
                  disabled={
                    readOnly || (state.associatedCompany && !state.company)
                  }
                  value={entry.other ? '__other__' : entry.name}
                  onChange={(values) => patchActivity(entry.id, { other: values[0] === '__other__', name: values[0] === '__other__' ? '' : values[0] ?? '' })} placeholder="Pesquisar atividade" />
              </Field>
              {entry.other && <Field label="Nome da outra atividade" required><input disabled={readOnly} maxLength={255} value={entry.name} onChange={(event) => patchActivity(entry.id, { name: event.target.value })} placeholder="Descreva a atividade realizada" /></Field>}
              <Questionnaire
                questions={activityQuestions}
                answers={entry.answers}
                disabled={readOnly}
                onChange={(answers) => patchActivity(entry.id, { answers })}
              />
            </div>
          ))}
          {!readOnly && (
            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                patch({
                  activities: [
                    ...state.activities,
                    {
                      id: `activity-${Date.now()}`,
                      name: "",
                      answers: { AT06: "4" },
                    },
                  ],
                })
              }
            >
              <Plus size={13} /> Adicionar atividade
            </button>
          )}
          <div className="step-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setStep("condition")}
            >
              Voltar
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => setStep("timeline")}
            >
              Continuar para linha do tempo
            </button>
          </div>
        </section>
      )}

      {step === "timeline" && (
        <section className="form-section">
          <SectionTitle
            icon={<Clock3 size={17} />}
            title="Linha do tempo"
            text="Campos calculados reaproveitam as datas anteriores e não são perguntados novamente."
          />
          {state.conditions.slice(0, 1).flatMap((condition) =>
            state.activities.map((activity, activityIndex) => {
              const key = `${condition.id}::${activity.id}`;
              const answers = state.timelineAnswers[key] ?? {};
              return (
                <div className="workflow-instance" key={key}>
                  <InstanceHeader
                    title={`Doença alegada × Atividade ${activityIndex + 1}`}
                    badge={activity.name || "Atividade ainda não selecionada"}
                  />
                  <Questionnaire
                    questions={timelineQuestions}
                    answers={answers}
                    context={{
                      ...condition.answers,
                      ...activity.answers,
                      ...answers,
                    }}
                    disabled={readOnly}
                    onChange={(nextAnswers) =>
                      patch({
                        timelineAnswers: {
                          ...state.timelineAnswers,
                          [key]: nextAnswers,
                        },
                      })
                    }
                  />
                </div>
              );
            }),
          )}
          <div className="step-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setStep("activity")}
            >
              Voltar
            </button>
            {!readOnly && (
              <span>
                Use os botões fixos abaixo para salvar o rascunho ou concluir o
                caso.
              </span>
            )}
          </div>
        </section>
      )}
    </form>
  );
}

function Questionnaire({
  questions,
  answers,
  context,
  disabled,
  onChange,
}: {
  questions: WorkflowQuestion[];
  answers: Record<string, AnswerValue>;
  context?: Record<string, AnswerValue>;
  disabled: boolean;
  onChange: (answers: Record<string, AnswerValue>) => void;
}) {
  const allAnswers = { ...context, ...answers };
  const expandedQuestions = questions.flatMap((question): WorkflowQuestion[] => {
    const condition = ['COND05', 'COND06', 'COND07'].includes(question.id);
    const activity = ['AT10', 'AT11', 'AT13', 'AT16'].includes(question.id);
    if (!condition && !activity) return [question];
    if (question.showWhen && !question.showWhen(allAnswers)) return [];
    const selected = allAnswers[condition ? 'COND04' : 'AT09'];
    const regions = regionData.filter((region) => Array.isArray(selected) && selected.includes(region.name));
    return regions.flatMap((region) => {
      const side = question.id === 'COND05' || question.id === 'AT10';
      const options = side ? region.central ? ['Central'] : ['Direito', 'Esquerdo', 'Ambos'] : question.id === 'COND06' ? question.options : region.movements;
      const main = { ...question, id: `${question.id}_${region.code}`, title: `${region.name} — ${side && region.central ? 'Localização central' : question.title}`, options, showWhen: undefined };
      return side ? [main, { id: `${question.id}_${region.code}_SUBREGIONS`, dimension: question.dimension, title: `${region.name} — ${region.name.startsWith('Dedos') ? 'Quais dedos?' : 'Detalhar sub-região (opcional)'}`, type: 'multi', options: region.subregions }] : [main];
    });
  });
  const set = (id: string, value: AnswerValue) => {
    const next = { ...answers, [id]: value };
    if (id === 'COND02' && value !== 'Sim') { delete next.COND03; delete next.COND03_OTHER; delete next.PROFILE_CONFIRM; }
    if (id === 'COND03') {
      const profile = catalogProfiles.find((entry) => entry.name === value);
      if (profile) {
        next.COND04 = regionData.filter((region) => profile.regions.includes(region.code)).map((region) => region.name);
        for (const code of profile.regions) {
          next[`COND06_${code}`] = profile.structures.map((structure) => structure[0].toUpperCase() + structure.slice(1));
          next[`COND07_${code}`] = profile.movements;
          if (regionData.find((region) => region.code === code)?.central) next[`COND05_${code}`] = 'Central';
        }
        next.PROFILE_CONFIRM = 'Não';
      } else delete next.PROFILE_CONFIRM;
    }
    onChange(next);
  };
  return (
    <div className="questionnaire">
      {answers.PROFILE_CONFIRM && <div className="inline-warning"><p>Regiões, estruturas e movimentos foram pré-preenchidos pelo catálogo. Confira e ajuste os dados para esta pessoa; o perfil é provisório.</p><button type="button" disabled={disabled || answers.PROFILE_CONFIRM === 'Sim'} onClick={() => set('PROFILE_CONFIRM', 'Sim')}>{answers.PROFILE_CONFIRM === 'Sim' ? 'Dados do perfil confirmados' : 'Confirmar dados do perfil'}</button></div>}
      {expandedQuestions
        .filter(
          (question) => !question.showWhen || question.showWhen(allAnswers),
        )
        .map((question) => (
          <div className="workflow-question" key={question.id}>
            <div className="question-copy">
              <span>
                {question.id} · {question.dimension}
              </span>
              <strong>{question.title}</strong>
            </div>
            <QuestionInput
              question={question}
              value={answers[question.id]}
              auxiliary={answers}
              disabled={disabled}
              onChange={(value) => set(question.id, value)}
              onAuxiliaryChange={(suffix, value) =>
                set(`${question.id}_${suffix}`, value)
              }
              context={allAnswers}
            />
          </div>
        ))}
    </div>
  );
}

function QuestionInput({
  question,
  value,
  auxiliary,
  disabled,
  onChange,
  onAuxiliaryChange,
  context,
}: {
  question: WorkflowQuestion;
  value?: AnswerValue;
  auxiliary: Record<string, AnswerValue>;
  disabled: boolean;
  onChange: (value: AnswerValue) => void;
  onAuxiliaryChange: (suffix: string, value: AnswerValue) => void;
  context: Record<string, AnswerValue>;
}) {
  if (question.type === "calculated")
    return (
      <div className="calculated-value">
        <CheckCircle2 size={14} />
        <span>{calculated(question.id, context)}</span>
        <small>Calculado automaticamente</small>
      </div>
    );
  if (question.type === "select")
    if (question.options?.length === 1 && question.options[0] === 'Central') return <p>Central — não se aplica lateralidade.</p>;
  if (question.type === 'text') return <input type="text" maxLength={255} disabled={disabled} value={typeof value === 'string' ? value : ''} onChange={(event) => onChange(event.target.value)} />;
  if (question.id === 'COND03') return <SearchableSelect label={question.title} options={(question.options ?? []).map((name) => ({ value: name, label: name }))} value={typeof value === 'string' ? value : ''} onChange={(values) => onChange(values[0] ?? '')} disabled={disabled} placeholder="Pesquisar diagnóstico específico" />;
  if (question.type === "select")
    return (
      <div className="answer-options">
        {question.options?.map((option) => (
          <button
            type="button"
            disabled={disabled}
            className={value === option ? "selected" : ""}
            aria-pressed={value === option}
            key={option}
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    );
  if (question.type === "multi") {
    const selected = Array.isArray(value) ? value : [];
    return (
      <div className="answer-options multi">
        {[...new Set([...(question.options ?? []), ...selected])].map((option) => (
          <button
            type="button"
            disabled={disabled}
            className={selected.includes(option) ? "selected" : ""}
            aria-pressed={selected.includes(option)}
            key={option}
            onClick={() =>
              onChange(
                selected.includes(option)
                  ? selected.filter((entry) => entry !== option)
                  : [...selected, option],
              )
            }
          >
            {selected.includes(option) ? "✓ " : "+ "}
            {option}
          </button>
        ))}
      </div>
    );
  }
  if (question.type === "date")
    return (
      <div className="compound-answer">
        <input
          type="date"
          disabled={disabled || value === "Ainda realiza"}
          value={typeof value === "string" && value !== "Ainda realiza" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
        />
        <label>
          <input
            type="checkbox"
            disabled={disabled}
            checked={auxiliary[`${question.id}_APPROXIMATE`] === "Sim"}
            onChange={(event) =>
              onAuxiliaryChange(
                "APPROXIMATE",
                event.target.checked ? "Sim" : "Não",
              )
            }
          />{" "}
          Data aproximada
        </label>
        {question.id === "AT02" && (
          <button
            type="button"
            disabled={disabled}
            aria-pressed={value === "Ainda realiza"}
            onClick={() => onChange(value === "Ainda realiza" ? "" : "Ainda realiza")}
          >
            {value === "Ainda realiza" ? "✓ Ainda realiza — informar término" : "Ainda realiza"}
          </button>
        )}
      </div>
    );
  if (question.type === "duration") {
    const hours = Number(value || 4);
    return (
      <div className="duration-answer">
        <div>
          <input
            type="range"
            min="1"
            max="8"
            step="0.25"
            disabled={disabled}
            value={hours}
            onChange={(event) => onChange(event.target.value)}
          />
          <output>{formatHours(hours)}</output>
        </div>
        <p>1 a 8 horas, em intervalos de 15 minutos</p>
        <label>Informar duração em horas
          <input aria-label="Duração em horas" type="number" min="1" max="8" step="0.25" value={hours} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
        </label>
        <div className="duration-ticks">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((hour) => (
            <span key={hour}>{hour}h</span>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="number-answer">
      <input
        type="number"
        min={question.id === 'AT03' ? '1' : '0'}
        max={question.id === 'AT03' ? '7' : undefined}
        step={['AT03', 'AT04', 'AT17', 'AT21', 'AT07_FREQUENCY'].includes(question.id) ? '1' : 'any'}
        disabled={disabled}
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange(event.target.value)}
      />
      <select
        disabled={disabled}
        value={String(
          auxiliary[`${question.id}_UNIT`] ?? question.unitOptions?.[0] ?? "",
        )}
        onChange={(event) => onAuxiliaryChange("UNIT", event.target.value)}
      >
        {question.unitOptions?.map((unit) => (
          <option key={unit}>{unit}</option>
        ))}
      </select>
    </div>
  );
}

function calculated(id: string, answers: Record<string, AnswerValue>) {
  const date = (value: AnswerValue | undefined) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? Date.parse(`${value}T00:00:00Z`) : NaN;
  const start = date(answers.AT01);
  const symptoms = date(answers.COND08);
  if (id === "LT01" || id === "LT02") {
    if (!Number.isFinite(start) || !Number.isFinite(symptoms)) return "Aguardando datas de atividade e sintomas";
    const days = Math.round((symptoms - start) / 86400000);
    if (id === "LT01") return days === 0 ? "Mesma data" : days > 0 ? "Depois" : "Antes";
    const approximate = answers.AT01_APPROXIMATE === "Sim" || answers.COND08_APPROXIMATE === "Sim";
    return `${approximate ? "Aproximadamente " : ""}${Math.abs(days)} dias${days < 0 ? " antes da exposição" : " após o início da exposição"}`;
  }
  if (id === "LT11") {
    if (answers.AT02 === "Ainda realiza") return "Não se aplica: atividade ainda realizada";
    const end = date(answers.AT02);
    return Number.isFinite(end) && Number.isFinite(symptoms) ? (symptoms > end ? "Sim" : "Não") : "Aguardando datas de término e sintomas";
  }
  return "Aguardando respostas";
}
function formatHours(value: number) {
  const hours = Math.floor(value);
  const minutes = Math.round((value - hours) * 60);
  return minutes
    ? `${hours}h ${String(minutes).padStart(2, "0")}min`
    : `${hours}h`;
}
function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  const Container = isValidElement(children) && children.type === SearchableSelect ? 'div' : 'label';
  return (
    <Container className="field">
      <span>
        {label}
        {required && <b>*</b>}
      </span>
      {children}
    </Container>
  );
}
function Toggle({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: boolean;
  disabled: boolean;
  onChange: () => void;
}) {
  return (
    <div className="switch-row">
      <div>
        <strong>{label}</strong>
        <span>Valores: Sim ou Não</span>
      </div>
      <button
        type="button"
        disabled={disabled}
        className={`switch ${value ? "on" : ""}`}
        onClick={onChange}
        role="switch"
        aria-checked={value}
        aria-label={label}
      >
        <i />
      </button>
    </div>
  );
}
function SectionTitle({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="section-title">
      <span>{icon}</span>
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </div>
  );
}
function InstanceHeader({
  title,
  badge,
  onRemove,
}: {
  title: string;
  badge?: string;
  onRemove?: () => void;
}) {
  return (
    <div className="instance-header">
      <div>
        <strong>{title}</strong>
        {badge && <span>{badge}</span>}
      </div>
      {onRemove && (
        <button type="button" onClick={onRemove}>
          <Trash2 size={13} /> Remover
        </button>
      )}
    </div>
  );
}
