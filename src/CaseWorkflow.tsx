import { useEffect, useState, type ReactNode } from "react";
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
  status: "Concluído" | "Em cadastro" | "Desatualizado";
  score: number;
  workflow?: CaseWorkflowState;
};

type SimpleEntity = { id: string; name: string };
type ConditionEntity = SimpleEntity & { cid: string; status: string };
type ActivityEntry = {
  id: string;
  name: string;
  answers: Record<string, AnswerValue>;
};
type ConditionEntry = { id: string; answers: Record<string, AnswerValue> };
type Step = "identification" | "condition" | "activity" | "timeline";

export type CaseWorkflowState = {
  name: string;
  associatedCompany: boolean;
  company: string;
  associatedSector: boolean;
  sector: string;
  conditions: ConditionEntry[];
  activities: ActivityEntry[];
  timelineAnswers: Record<string, Record<string, AnswerValue>>;
};

const companyActivities: Record<string, string[]> = {
  "Saúde Tech": ["Operação de empilhadeira", "Levantamento de caixas"],
  UFLAniana: ["Digitação intensa", "Atendimento ao público"],
  "Nova Safra": ["Separação de pedidos", "Montagem de kits"],
  "Logis Minas": ["Deslocamento de carga", "Conferência de estoque"],
};
const unlinkedActivities = [
  "Digitação intensa",
  "Levantamento de caixas",
  "Separação de pedidos",
  "Atividade sem vinculação",
];

function emptyState(item?: CaseWorkflowRecord): CaseWorkflowState {
  if (item?.workflow) return item.workflow;
  return {
    name: item?.name ?? "",
    associatedCompany: Boolean(item?.company),
    company: item?.company ?? "",
    associatedSector: Boolean(item?.sector),
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
  onSave,
}: {
  item?: CaseWorkflowRecord;
  mode: "create" | "edit" | "view";
  companies: SimpleEntity[];
  conditions: ConditionEntity[];
  onSave: (item: CaseWorkflowRecord) => void;
}) {
  const readOnly = mode === "view";
  const draftKey = item ? `nexo-case-v2-${item.id}` : "nexo-new-case-draft-v2";
  const [step, setStep] = useState<Step>("identification");
  const [state, setState] = useState<CaseWorkflowState>(() => {
    if (!item && typeof window !== "undefined") {
      const stored = window.sessionStorage.getItem(draftKey);
      if (stored) return JSON.parse(stored) as CaseWorkflowState;
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
      ? (sectorsByCompany[state.company] ?? [])
      : [];
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
    if (state.associatedCompany && !state.company)
      nextErrors.push("Selecione a empresa associada.");
    if (state.associatedSector && !state.sector)
      nextErrors.push("Selecione o setor da empresa.");
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
    const draft = submitter?.value === "draft";
    if (!draft && !validate()) return;
    const conditionName = String(
      state.conditions[0]?.answers.COND03 ||
        "Condição sem diagnóstico específico",
    );
    const cid =
      conditions.find((entry) => entry.name === conditionName)?.cid ?? "";
    const principals = state.activities
      .filter((entry) => activityHours(entry) === maxHours)
      .map((entry) => entry.name)
      .join(", ");
    const completedAnswers = [
      ...state.conditions.flatMap((entry) => Object.values(entry.answers)),
      ...state.activities.flatMap((entry) => Object.values(entry.answers)),
      ...Object.values(state.timelineAnswers).flatMap((answers) =>
        Object.values(answers),
      ),
    ].filter((value) =>
      Array.isArray(value) ? value.length : Boolean(value),
    ).length;
    const score = draft ? 0 : Math.min(96, Math.max(42, 42 + completedAnswers));
    window.sessionStorage.removeItem(draftKey);
    onSave({
      id:
        item?.id ??
        `${(state.company || "SEM").slice(0, 3).toUpperCase()}-${String(Date.now()).slice(-3)}`,
      name: state.name.trim(),
      injury: conditionName,
      cid,
      company: state.associatedCompany ? state.company : "",
      sector: state.associatedSector ? state.sector : "",
      activity: principals,
      status: draft ? "Em cadastro" : "Concluído",
      score,
      workflow: state,
    });
  };

  return (
    <form id="cases-form" onSubmit={submit}>
      <div className="workflow-stepper">
        {(
          [
            ["identification", "1", "Identificação"],
            ["condition", "2", "Condição alegada"],
            ["activity", "3", "Atividade realizada"],
            ["timeline", "4", "Linha do tempo"],
          ] as const
        ).map(([id, number, label]) => (
          <button
            type="button"
            key={id}
            className={step === id ? "active" : ""}
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
                <select
                  disabled={readOnly}
                  value={state.company}
                  onChange={(event) =>
                    patch({
                      company: event.target.value,
                      sector: "",
                      activities: state.activities.map((entry) => ({
                        ...entry,
                        name: "",
                      })),
                    })
                  }
                >
                  <option value="">Selecione a empresa</option>
                  {companies.map((entry) => (
                    <option key={entry.id}>{entry.name}</option>
                  ))}
                </select>
              </Field>
              <Toggle
                label="Esse caso é associado a algum setor?"
                value={state.associatedSector}
                disabled={readOnly}
                onChange={() =>
                  patch({
                    associatedSector: !state.associatedSector,
                    sector: "",
                  })
                }
              />
              {state.associatedSector && (
                <Field label="Setor da empresa" required>
                  <select
                    disabled={readOnly || !state.company}
                    value={state.sector}
                    onChange={(event) => patch({ sector: event.target.value })}
                  >
                    <option value="">
                      {state.company
                        ? "Selecione o setor"
                        : "Selecione primeiro a empresa"}
                    </option>
                    {sectors.map((sector) => (
                      <option key={sector}>{sector}</option>
                    ))}
                  </select>
                </Field>
              )}
            </div>
          )}
          <div className="step-actions">
            <button
              type="button"
              className="primary-button"
              onClick={() => setStep("condition")}
            >
              Continuar para condição
            </button>
          </div>
        </section>
      )}

      {step === "condition" && (
        <section className="form-section">
          <SectionTitle
            icon={<Activity size={17} />}
            title="Condição alegada"
            text="Questionário aplicado separadamente para cada condição."
          />
          {state.conditions.map((entry, index) => (
            <div className="workflow-instance" key={entry.id}>
              <InstanceHeader
                title={`Condição ${index + 1}`}
                onRemove={
                  !readOnly && state.conditions.length > 1
                    ? () =>
                        patch({
                          conditions: state.conditions.filter(
                            (condition) => condition.id !== entry.id,
                          ),
                        })
                    : undefined
                }
              />
              <Questionnaire
                questions={conditionQuestions}
                answers={entry.answers}
                disabled={readOnly}
                onChange={(answers) => patchCondition(entry.id, answers)}
              />
            </div>
          ))}
          {!readOnly && (
            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                patch({
                  conditions: [
                    ...state.conditions,
                    { id: `condition-${Date.now()}`, answers: {} },
                  ],
                })
              }
            >
              <Plus size={13} /> Adicionar condição alegada
            </button>
          )}
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
                <select
                  disabled={
                    readOnly || (state.associatedCompany && !state.company)
                  }
                  value={entry.name}
                  onChange={(event) =>
                    patchActivity(entry.id, { name: event.target.value })
                  }
                >
                  <option value="">Selecione a atividade</option>
                  {activityOptions.map((name) => (
                    <option key={name}>{name}</option>
                  ))}
                </select>
              </Field>
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
          {state.conditions.flatMap((condition, conditionIndex) =>
            state.activities.map((activity, activityIndex) => {
              const key = `${condition.id}::${activity.id}`;
              const answers = state.timelineAnswers[key] ?? {};
              return (
                <div className="workflow-instance" key={key}>
                  <InstanceHeader
                    title={`Condição ${conditionIndex + 1} × Atividade ${activityIndex + 1}`}
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
  const set = (id: string, value: AnswerValue) =>
    onChange({ ...answers, [id]: value });
  return (
    <div className="questionnaire">
      {questions
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
    return (
      <div className="answer-options">
        {question.options?.map((option) => (
          <button
            type="button"
            disabled={disabled}
            className={value === option ? "selected" : ""}
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
        {question.options?.map((option) => (
          <button
            type="button"
            disabled={disabled}
            className={selected.includes(option) ? "selected" : ""}
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
          disabled={disabled}
          value={typeof value === "string" ? value : ""}
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
            onClick={() => onChange("Ainda realiza")}
          >
            Ainda realiza
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
        min="0"
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
  if (id === "LT01")
    return answers.AT01 && answers.COND08
      ? "Comparação disponível após salvar as datas"
      : "Aguardando datas de atividade e sintomas";
  if (id === "LT02")
    return answers.AT01 && answers.COND08
      ? "Intervalo calculado automaticamente"
      : "Aguardando datas";
  if (id === "LT11")
    return answers.AT02 && answers.COND08
      ? "Resultado calculado pelas datas informadas"
      : "Aguardando data de término";
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
  return (
    <label className="field">
      <span>
        {label}
        {required && <b>*</b>}
      </span>
      {children}
    </label>
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
        aria-pressed={value}
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
