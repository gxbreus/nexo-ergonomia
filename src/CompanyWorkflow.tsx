import { useState, type ReactNode } from "react";
import { Building2, Plus, Trash2, Users } from "lucide-react";
import { SearchableSelect } from './SearchableSelect';

type CaseItem = {
  id: string;
  name: string;
  injury: string;
  company: string;
  sector?: string;
  status: string;
};
export type CompanyWorkflowRecord = {
  id: string;
  name: string;
  initials: string;
  total: number;
  complete: number;
  drafts: number;
  average: number;
  priority: number;
  sectors?: SectorEntry[];
};
type SectorEntry = { id: string; name: string; caseIds: string[] };

export function CompanyWorkflow({
  item,
  mode,
  cases,
  onSave,
}: {
  item?: CompanyWorkflowRecord;
  mode: "create" | "edit" | "view";
  cases: CaseItem[];
  onSave: (item: CompanyWorkflowRecord, linked: string[]) => void;
}) {
  const readOnly = mode === "view";
  const [name, setName] = useState(item?.name ?? "");
  const [hasPrevious, setHasPrevious] = useState(
    Boolean(item && cases.some((entry) => entry.company === item.name)),
  );
  const [linked, setLinked] = useState<string[]>(
    item
      ? cases
          .filter((entry) => entry.company === item.name)
          .map((entry) => entry.id)
      : [],
  );
  const [addSector, setAddSector] = useState(Boolean(item?.sectors?.length));
  const [sectors, setSectors] = useState<SectorEntry[]>(item?.sectors ?? []);
  const [error, setError] = useState('');
  const eligibleCases = cases.filter(
    (entry) => !entry.company || linked.includes(entry.id),
  );
  const linkedCases = cases.filter((entry) => linked.includes(entry.id));
  const assigned = new Set(sectors.flatMap((sector) => sector.caseIds));

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const selected = hasPrevious ? linked : [];
    if (addSector && (!sectors.length || sectors.some((sector) => !sector.name.trim() || !sector.caseIds.some((id) => selected.includes(id))))) {
      setError('Adicione ao menos um setor e informe o nome e os casos associados de cada setor.'); return;
    }
    if (
      !name.trim() ||
      (addSector && sectors.some((sector) => !sector.name.trim()))
    )
      return;
    onSave(
      {
        id: item?.id ?? `EMP-${String(Date.now()).slice(-4)}`,
        name: name.trim(),
        initials: name
          .split(" ")
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0])
          .join("")
          .toUpperCase(),
        total: selected.length,
        complete: selected.filter(
          (id) =>
            cases.find((entry) => entry.id === id)?.status === "Concluído",
        ).length,
        drafts: selected.filter(
          (id) =>
            cases.find((entry) => entry.id === id)?.status === "Em cadastro",
        ).length,
        average: item?.average ?? 0,
        priority: item?.priority ?? 0,
        sectors: addSector ? sectors.map((sector) => ({ ...sector, name: sector.name.trim(), caseIds: sector.caseIds.filter((id) => selected.includes(id)) })) : [],
      },
      selected,
    );
  };

  return (
    <form id="companies-form" onSubmit={submit}>
      {error && <div className="inline-warning" role="alert">{error}</div>}
      <section className="form-section">
        <SectionTitle
          icon={<Building2 size={17} />}
          title="Informações básicas"
          text="Cadastro da empresa e vinculação de casos já existentes."
        />
        <Field label="Nome fantasia da empresa" required>
          <input
            required
            disabled={readOnly}
            maxLength={255}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex.: Saúde Tech"
          />
        </Field>
        <Toggle
          label="Essa empresa tem algum caso prévio associado?"
          value={hasPrevious}
          disabled={readOnly}
          onChange={() => {
            setHasPrevious(!hasPrevious);
            if (hasPrevious) setLinked([]);
          }}
        />
        {hasPrevious && (
          <div className="conditional-block">
            <p className="condition-label">
              DISPONÍVEL PORQUE EXISTEM CASOS PRÉVIOS PARA VINCULAR
            </p>
            <div className="case-linker">
              <label>Casos do usuário sem vinculação com empresa</label>
              <SearchableSelect label="Casos associados" multiple allowCustom={false} disabled={readOnly} options={eligibleCases.map((entry) => ({ value: entry.id, label: entry.name, description: `${entry.id} · ${entry.injury}` }))} value={linked} onChange={(values) => { setLinked(values); setSectors((items) => items.map((sector) => ({ ...sector, caseIds: sector.caseIds.filter((id) => values.includes(id)) }))); }} placeholder="Pesquisar e selecionar casos" />
            </div>
          </div>
        )}
      </section>
      <section className="form-section spaced">
        <SectionTitle
          icon={<Users size={17} />}
          title="Setores"
          text="Cada setor pode receber casos vinculados à empresa que ainda estejam sem setor."
        />
        <Toggle
          label="Adicionar setor?"
          value={addSector}
          disabled={readOnly}
          onChange={() => setAddSector(!addSector)}
        />
        {addSector && (
          <div className="conditional-block">
            <p className="condition-label">
              DISPONÍVEL PORQUE “ADICIONAR SETOR?” = SIM
            </p>
            {sectors.map((sector, index) => (
              <article className="workflow-instance" key={sector.id}>
                <div className="instance-header">
                  <div>
                    <strong>Setor {index + 1}</strong>
                  </div>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() =>
                        setSectors((items) =>
                          items.filter((entry) => entry.id !== sector.id),
                        )
                      }
                    >
                      <Trash2 size={13} /> Remover
                    </button>
                  )}
                </div>
                <Field label="Nome do setor" required>
                  <input
                    disabled={readOnly}
                    maxLength={255}
                    value={sector.name}
                    onChange={(event) =>
                      setSectors((items) =>
                        items.map((entry) =>
                          entry.id === sector.id
                            ? { ...entry, name: event.target.value }
                            : entry,
                        ),
                      )
                    }
                  />
                </Field>
                <div className="case-linker sector-cases">
                  <label>Associar casos da empresa sem setor</label>
                  <SearchableSelect label={`Casos do setor ${index + 1}`} multiple allowCustom={false} disabled={readOnly} options={linkedCases.filter((entry) => !assigned.has(entry.id) || sector.caseIds.includes(entry.id)).map((entry) => ({ value: entry.id, label: entry.name, description: entry.id }))} value={sector.caseIds} onChange={(values) => setSectors((items) => items.map((current) => current.id === sector.id ? { ...current, caseIds: values } : current))} placeholder="Pesquisar casos sem setor" />
                </div>
              </article>
            ))}
            {!readOnly && (
              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  setSectors((items) => [
                    ...items,
                    { id: `sector-${Date.now()}`, name: "", caseIds: [] },
                  ])
                }
              >
                <Plus size={13} /> Adicionar setor
              </button>
            )}
          </div>
        )}
      </section>
      {item && (
        <section className="form-section spaced">
          <SectionTitle
            icon={<Users size={17} />}
            title="Resumo"
            text="Totais exigidos na visualização da empresa."
          />
          <div className="read-stats">
            <span>
              <small>TOTAL DE CASOS</small>
              <strong>{item.total}</strong>
            </span>
            <span>
              <small>CONCLUÍDOS</small>
              <strong>{item.complete}</strong>
            </span>
            <span>
              <small>EM CADASTRO</small>
              <strong>{item.drafts}</strong>
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
