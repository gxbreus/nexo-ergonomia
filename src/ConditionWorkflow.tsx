import { useState, type ReactNode } from "react";
import { Activity, FilePlus2, Plus, Trash2 } from "lucide-react";
import { bodyRegions } from "./workflowData";

type CustomQuestion = {
  id: string;
  title: string;
  type: "Seleção simples" | "Seleção múltipla" | "Valor numérico";
  weight: number;
  options: { id: string; label: string; weight: number }[];
};
type RegionEntry = { name: string; side: string };
export type ConditionWorkflowRecord = {
  id: string;
  name: string;
  type: "Doença" | "Lesão";
  cid: string;
  region: string;
  side: string;
  status: "Ativa" | "Em cadastro" | "Desativada";
  cases: number;
  revision?: string;
  release?: string;
  regions?: RegionEntry[];
  questions?: CustomQuestion[];
  updatedAt?: string;
  responsible?: string;
};

const releases: Record<string, string[]> = {
  "CID-10": ["2019", "2020", "2021"],
  "CID-11": ["2022-02", "2023-01", "2024-01"],
};
const spinalRegions = new Set([
  "Pescoço/região cervical",
  "Região torácica/dorsal superior",
  "Região lombar/lombossacral",
]);

export function ConditionWorkflow({
  item,
  mode,
  onSave,
}: {
  item?: ConditionWorkflowRecord;
  mode: "create" | "edit" | "view";
  onSave: (item: ConditionWorkflowRecord) => void;
}) {
  const readOnly = mode === "view";
  const [name, setName] = useState(item?.name ?? "");
  const [type, setType] = useState<"Doença" | "Lesão">(item?.type ?? "Doença");
  const [cid, setCid] = useState(item?.cid ?? "");
  const [revision, setRevision] = useState(item?.revision ?? "CID-10");
  const [release, setRelease] = useState(item?.release ?? "2021");
  const [affectsRegion, setAffectsRegion] = useState(Boolean(item?.region));
  const [regions, setRegions] = useState<RegionEntry[]>(
    item?.regions ??
      (item?.region
        ? item.region
            .split(", ")
            .map((region) => ({
              name: region,
              side:
                item.side || (spinalRegions.has(region) ? "Central" : "Ambos"),
            }))
        : []),
  );
  const [addQuestions, setAddQuestions] = useState(
    Boolean(item?.questions?.length),
  );
  const [questions, setQuestions] = useState<CustomQuestion[]>(
    item?.questions ?? [],
  );
  const [errors, setErrors] = useState<string[]>([]);

  const toggleRegion = (region: string) =>
    setRegions((items) =>
      items.some((entry) => entry.name === region)
        ? items.filter((entry) => entry.name !== region)
        : [
            ...items,
            {
              name: region,
              side: spinalRegions.has(region) ? "Central" : "Ambos",
            },
          ],
    );
  const resizeOptions = (id: string, count: number) =>
    setQuestions((items) =>
      items.map((question) =>
        question.id === id
          ? {
              ...question,
              options: Array.from(
                { length: Math.max(1, Math.floor(count || 1)) },
                (_, index) =>
                  question.options[index] ?? {
                    id: `${id}-${index}`,
                    label: "",
                    weight: 0,
                  },
              ),
            }
          : question,
      ),
    );
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null;
    const draft = submitter?.value === "true";
    const nextErrors: string[] = [];
    if (!name.trim()) nextErrors.push("Informe o nome da doença ou lesão.");
    if (!cid.trim() || cid.length > 20)
      nextErrors.push("Informe um CID válido com até 20 caracteres.");
    if (!revision || !release)
      nextErrors.push("Selecione a revisão e o release do CID.");
    if (affectsRegion && !regions.length)
      nextErrors.push("Selecione ao menos uma região corporal.");
    if (
      addQuestions &&
      questions.some(
        (question) =>
          !question.title.trim() ||
          question.weight < 0 ||
          question.weight > 100 ||
          (question.type !== "Valor numérico" &&
            question.options.some(
              (option) =>
                !option.label.trim() ||
                option.weight < 0 ||
                option.weight > 100,
            )),
      )
    )
      nextErrors.push(
        "Complete títulos e pesos de todas as perguntas e opções.",
      );
    setErrors(nextErrors);
    if (!draft && nextErrors.length) return;
    onSave({
      id: item?.id ?? `CON-${String(Date.now()).slice(-4)}`,
      name: name.trim(),
      type,
      cid: cid.trim(),
      revision,
      release,
      regions: affectsRegion ? regions : [],
      region: affectsRegion
        ? regions.map((entry) => entry.name).join(", ")
        : "",
      side: affectsRegion
        ? [...new Set(regions.map((entry) => entry.side))].join(", ")
        : "Não se aplica",
      questions: addQuestions ? questions : [],
      status: draft ? "Em cadastro" : "Ativa",
      cases: item?.cases ?? 0,
      updatedAt: new Date().toLocaleString("pt-BR"),
      responsible: "Gabriel Soares",
    });
  };

  return (
    <form id="conditions-form" onSubmit={submit}>
      {errors.length > 0 && (
        <div className="validation-summary">
          <strong>Revise os campos:</strong>
          {errors.map((error) => (
            <span key={error}>• {error}</span>
          ))}
        </div>
      )}
      <section className="form-section">
        <SectionTitle
          icon={<Activity size={17} />}
          title="Informações básicas"
          text="Cadastro clínico e versão oficial do CID."
        />
        <div className="form-grid">
          <Field label="Nome da doença ou lesão" required>
            <input
              disabled={readOnly}
              maxLength={255}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <Field label="Tipo da condição" required>
            <select
              disabled={readOnly}
              value={type}
              onChange={(event) =>
                setType(event.target.value as "Doença" | "Lesão")
              }
            >
              <option>Doença</option>
              <option>Lesão</option>
            </select>
          </Field>
          <Field label="CID da doença" required>
            <input
              disabled={readOnly}
              maxLength={20}
              value={cid}
              onChange={(event) => setCid(event.target.value)}
              placeholder="Ex.: M75.1"
            />
          </Field>
          <Field label="Revisão do CID" required>
            <select
              disabled={readOnly}
              value={revision}
              onChange={(event) => {
                const next = event.target.value;
                setRevision(next);
                setRelease(releases[next][0]);
              }}
            >
              <option>CID-10</option>
              <option>CID-11</option>
            </select>
          </Field>
          <Field label="Release do CID" required>
            <select
              disabled={readOnly}
              value={release}
              onChange={(event) => setRelease(event.target.value)}
            >
              {releases[revision].map((entry) => (
                <option key={entry}>{entry}</option>
              ))}
            </select>
          </Field>
        </div>
        <Toggle
          label="Afeta pelo menos uma região corporal específica?"
          value={affectsRegion}
          disabled={readOnly}
          onChange={() => {
            setAffectsRegion(!affectsRegion);
            if (affectsRegion) setRegions([]);
          }}
        />
        {affectsRegion && (
          <div className="conditional-block">
            <p className="condition-label">
              EXIBIDA PORQUE A CONDIÇÃO AFETA REGIÃO CORPORAL
            </p>
            <div className="region-pills">
              {bodyRegions.map((region) => (
                <button
                  type="button"
                  disabled={readOnly}
                  className={
                    regions.some((entry) => entry.name === region)
                      ? "selected"
                      : ""
                  }
                  key={region}
                  onClick={() => toggleRegion(region)}
                >
                  {regions.some((entry) => entry.name === region) ? "✓ " : "+ "}
                  {region}
                </button>
              ))}
            </div>
            {regions.map((region) => (
              <div className="region-detail" key={region.name}>
                <strong>{region.name}</strong>
                <Field label="Lateralidade">
                  <select
                    disabled={readOnly || spinalRegions.has(region.name)}
                    value={region.side}
                    onChange={(event) =>
                      setRegions((items) =>
                        items.map((entry) =>
                          entry.name === region.name
                            ? { ...entry, side: event.target.value }
                            : entry,
                        ),
                      )
                    }
                  >
                    {spinalRegions.has(region.name) ? (
                      <option>Central</option>
                    ) : (
                      <>
                        <option>Direito</option>
                        <option>Esquerdo</option>
                        <option>Ambos</option>
                      </>
                    )}
                  </select>
                </Field>
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="form-section spaced">
        <SectionTitle
          icon={<FilePlus2 size={17} />}
          title="Perguntas adicionais"
          text="Perguntas configuráveis com peso no índice de compatibilidade."
        />
        <Toggle
          label="Adicionar mais perguntas?"
          value={addQuestions}
          disabled={readOnly}
          onChange={() => setAddQuestions(!addQuestions)}
        />
        {addQuestions && (
          <div className="conditional-block">
            <p className="condition-label">PERGUNTA ADICIONAL</p>
            {questions.map((question, index) => (
              <article className="question-builder" key={question.id}>
                <div className="builder-head">
                  <span>PERGUNTA {index + 1}</span>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() =>
                        setQuestions((items) =>
                          items.filter((entry) => entry.id !== question.id),
                        )
                      }
                    >
                      <Trash2 size={13} /> Remover
                    </button>
                  )}
                </div>
                <div className="form-grid">
                  <Field label="Título" required>
                    <input
                      disabled={readOnly}
                      maxLength={255}
                      value={question.title}
                      onChange={(event) =>
                        setQuestions((items) =>
                          items.map((entry) =>
                            entry.id === question.id
                              ? { ...entry, title: event.target.value }
                              : entry,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Field label="Tipo de resposta" required>
                    <select
                      disabled={readOnly}
                      value={question.type}
                      onChange={(event) =>
                        setQuestions((items) =>
                          items.map((entry) =>
                            entry.id === question.id
                              ? {
                                  ...entry,
                                  type: event.target
                                    .value as CustomQuestion["type"],
                                }
                              : entry,
                          ),
                        )
                      }
                    >
                      <option>Seleção simples</option>
                      <option>Seleção múltipla</option>
                      <option>Valor numérico</option>
                    </select>
                  </Field>
                  <Field label="Peso da pergunta (0 a 100)" required>
                    <input
                      disabled={readOnly}
                      type="number"
                      min="0"
                      max="100"
                      value={question.weight}
                      onChange={(event) =>
                        setQuestions((items) =>
                          items.map((entry) =>
                            entry.id === question.id
                              ? { ...entry, weight: Number(event.target.value) }
                              : entry,
                          ),
                        )
                      }
                    />
                  </Field>
                  {question.type !== "Valor numérico" && (
                    <Field label="Quantas opções?" required>
                      <input
                        disabled={readOnly}
                        type="number"
                        min="1"
                        step="1"
                        value={question.options.length}
                        onChange={(event) =>
                          resizeOptions(question.id, Number(event.target.value))
                        }
                      />
                    </Field>
                  )}
                </div>
                {question.type !== "Valor numérico" && (
                  <div className="option-list">
                    {question.options.map((option, optionIndex) => (
                      <div className="option-row" key={option.id}>
                        <span>Opção {optionIndex + 1}</span>
                        <input
                          disabled={readOnly}
                          maxLength={255}
                          value={option.label}
                          placeholder="Nome da opção"
                          onChange={(event) =>
                            setQuestions((items) =>
                              items.map((entry) =>
                                entry.id === question.id
                                  ? {
                                      ...entry,
                                      options: entry.options.map((current) =>
                                        current.id === option.id
                                          ? {
                                              ...current,
                                              label: event.target.value,
                                            }
                                          : current,
                                      ),
                                    }
                                  : entry,
                              ),
                            )
                          }
                        />
                        <input
                          disabled={readOnly}
                          type="number"
                          min="0"
                          max="100"
                          value={option.weight}
                          title="Peso da opção"
                          onChange={(event) =>
                            setQuestions((items) =>
                              items.map((entry) =>
                                entry.id === question.id
                                  ? {
                                      ...entry,
                                      options: entry.options.map((current) =>
                                        current.id === option.id
                                          ? {
                                              ...current,
                                              weight: Number(
                                                event.target.value,
                                              ),
                                            }
                                          : current,
                                      ),
                                    }
                                  : entry,
                              ),
                            )
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ))}
            {!readOnly && (
              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  setQuestions((items) => [
                    ...items,
                    {
                      id: `question-${Date.now()}`,
                      title: "",
                      type: "Seleção simples",
                      weight: 0,
                      options: [
                        { id: `option-${Date.now()}-1`, label: "", weight: 0 },
                      ],
                    },
                  ])
                }
              >
                <Plus size={13} /> Adicionar pergunta
              </button>
            )}
          </div>
        )}
      </section>
      {item && (
        <section className="form-section spaced">
          <SectionTitle
            icon={<Activity size={17} />}
            title="Situação do cadastro"
            text="Rastreabilidade exigida na visualização."
          />
          <div className="read-stats">
            <span>
              <small>STATUS</small>
              <strong>{item.status}</strong>
            </span>
            <span>
              <small>ÚLTIMA ALTERAÇÃO</small>
              <strong>{item.updatedAt ?? "Hoje"}</strong>
            </span>
            <span>
              <small>RESPONSÁVEL</small>
              <strong>{item.responsible ?? "Gabriel Soares"}</strong>
            </span>
          </div>
        </section>
      )}
    </form>
  );
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
