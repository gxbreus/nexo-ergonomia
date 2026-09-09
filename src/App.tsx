import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  Building2,
  ChevronLeft,
  ClipboardList,
  Edit3,
  Eye,
  FilePlus2,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  cases,
  companies,
  conditions,
  dimensions,
  type CaseStatus,
  type ConditionStatus,
} from "./data";
import {
  CaseWorkflow as CaseForm,
  type CaseWorkflowRecord,
} from "./CaseWorkflow";
import {
  CompanyWorkflow as CompanyForm,
  type CompanyWorkflowRecord,
} from "./CompanyWorkflow";
import {
  ConditionWorkflow as ConditionForm,
  type ConditionWorkflowRecord,
} from "./ConditionWorkflow";
import { bodyRegions } from "./workflowData";
import { CompanyAnalysis } from "./CompanyAnalysis";

type View = "cases" | "companies" | "conditions";
type Mode = "create" | "edit" | "view" | "analytics" | "index" | "history";
type CaseItem = CaseWorkflowRecord;
type CompanyItem = CompanyWorkflowRecord;
type ConditionItem = ConditionWorkflowRecord;
type Overlay = { entity: View; mode: Mode; id?: string } | null;
type ActivityDraft = { id: string; name: string; hours: number };
type Question = {
  id: string;
  title: string;
  type: "Seleção simples" | "Seleção múltipla" | "Valor numérico";
  weight: number;
  options: { id: string; label: string; weight: number }[];
};

const activityByCompany: Record<string, string[]> = {
  "Saúde Tech": ["Operação de empilhadeira", "Levantamento de caixas"],
  UFLAniana: ["Digitação intensa", "Atendimento ao público"],
  "Nova Safra": ["Separação de pedidos", "Montagem de kits"],
  "Logis Minas": ["Deslocamento de carga", "Conferência de estoque"],
};
const noCompanyActivities = [
  "Digitação intensa",
  "Levantamento de caixas",
  "Separação de pedidos",
  "Atividade sem vinculação",
];
const regions = [
  "Ombro",
  "Cotovelo",
  "Punho e mão",
  "Coluna lombar",
  "Tornozelo",
  "Joelho",
];
const sideLabel = (value: string) => value || "Não informado";
const statusClass = (status: string) =>
  `status status-${status
    .toLowerCase()
    .replaceAll(" ", "-")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")}`;
const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

function useStoredRecords<T extends { id: string }>(key: string, seed: T[]) {
  const [records, setRecords] = useState<T[]>(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) as T[] : seed;
    } catch { return seed; }
  });
  useEffect(() => {
    const previous: T[] = JSON.parse(localStorage.getItem(key) ?? "[]");
    for (const record of records) {
      const old = previous.find((entry) => entry.id === record.id);
      if (JSON.stringify(old) === JSON.stringify(record)) continue;
      const historyKey = `nexo-history-${record.id}`;
      const history = JSON.parse(localStorage.getItem(historyKey) ?? "[]");
      history.unshift({ date: new Date().toLocaleString("pt-BR"), action: old ? "Cadastro alterado" : "Registro incluído na base local", fields: old ? Object.keys(record).filter((field) => JSON.stringify(record[field as keyof T]) !== JSON.stringify(old[field as keyof T])).join(", ") : "", responsible: "Gabriel Soares" });
      localStorage.setItem(historyKey, JSON.stringify(history));
    }
    localStorage.setItem(key, JSON.stringify(records));
  }, [key, records]);
  return [records, setRecords] as const;
}

export default function App() {
  const [view, setView] = useState<View>("cases");
  const [caseItems, setCaseItems] = useStoredRecords<CaseItem>("nexo-cases-v3", [
    ...cases,
    {
      id: "CAS-0243",
      name: "Luiza Melo",
      injury: "Dor lombar baixa",
      cid: "M54.5",
      company: "",
      activity: "Atividade sem vinculação",
      status: "Em cadastro",
      score: 0,
    },
  ]);
  const [companyItems, setCompanyItems] = useStoredRecords<CompanyItem>("nexo-companies-v3", companies);
  const countedCompanies = companyItems.map((company) => {
    const linked = caseItems.filter((entry) => entry.company === company.name);
    return { ...company, total: linked.length, complete: linked.filter((entry) => entry.status === 'Concluído').length, drafts: linked.filter((entry) => entry.status === 'Em cadastro').length };
  });
  const [conditionItems, setConditionItems] = useStoredRecords<ConditionItem>("nexo-conditions-v3",
    conditions.map((item) => ({
      ...item,
      type: item.type as "Doença" | "Lesão",
    })),
  );
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [query, setQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [extraFilter, setExtraFilter] = useState("Todos");
  const [multiFilterA, setMultiFilterA] = useState<string[]>([]);
  const [multiFilterB, setMultiFilterB] = useState<string[]>([]);
  const [selectFilterA, setSelectFilterA] = useState("Todos");
  const [selectFilterB, setSelectFilterB] = useState("Todos");
  const [searched, setSearched] = useState<Record<View, boolean>>({
    cases: false,
    companies: false,
    conditions: false,
  });
  const [toast, setToast] = useState("");
  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const title =
    view === "cases"
      ? "Gerenciar casos"
      : view === "companies"
        ? "Gerenciar empresas"
        : "Gerenciar doenças e lesões";
  const description =
    view === "cases"
      ? "Registre, acompanhe e analise os casos de ergonomia."
      : view === "companies"
        ? "Organize as empresas e acompanhe seus indicadores."
        : "Cadastre condições e construa perguntas para o diagnóstico.";
  const activeFilters =
    Number(statusFilter !== "Todos") +
    Number(extraFilter !== "Todos") +
    multiFilterA.length +
    multiFilterB.length +
    Number(selectFilterA !== "Todos") +
    Number(selectFilterB !== "Todos");
  const open = (entity: View, mode: Mode, id?: string) => {
    if (entity === "cases" && mode === "edit" && id)
      setCaseItems((items) =>
        items.map((item) =>
          item.id === id ? { ...item, status: "Em cadastro" } : item,
        ),
      );
    setOverlay({ entity, mode, id });
  };
  const remove = (entity: View, id: string) => {
    if (!window.confirm("Excluir este registro do protótipo?")) return;
    if (entity === "cases")
      setCaseItems((items) => items.filter((item) => item.id !== id));
    if (entity === "companies") {
      const company = companyItems.find((item) => item.id === id);
      setCompanyItems((items) => items.filter((item) => item.id !== id));
      if (company)
        setCaseItems((items) =>
          items.map((item) =>
            item.company === company.name ? { ...item, company: "" } : item,
          ),
        );
    }
    if (entity === "conditions")
      setConditionItems((items) => items.filter((item) => item.id !== id));
    setOverlay(null);
    showToast("Registro excluído.");
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img className="brand-mark" src="/nexo-logo-light.svg" alt="NEXO" />
          <div>
            <strong>NEXO</strong>
            <span>ERGONOMIA INTELIGENTE</span>
          </div>
        </div>
        <nav>
          {(
            [
              { id: "cases", label: "Casos", icon: ClipboardList },
              { id: "companies", label: "Empresas", icon: Building2 },
              { id: "conditions", label: "Doenças e lesões", icon: Activity },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${view === id ? "active" : ""}`}
              onClick={() => {
                setView(id);
                setQuery("");
                setStatusFilter("Todos");
                setExtraFilter("Todos");
                setMultiFilterA([]);
                setMultiFilterB([]);
                setSelectFilterA("Todos");
                setSelectFilterB("Todos");
              }}
            >
              <span className="nav-icon">
                <Icon size={15} />
              </span>
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span>✦</span>
          <div>
            <strong>Dados demonstrativos</strong>
            <small>Sem conexão com backend</small>
          </div>
        </div>
        <div className="profile">
          <span className="avatar">GS</span>
          <div>
            <strong>Gabriel Soares</strong>
            <small>Administrador</small>
          </div>
        </div>
      </aside>
      <main className="workspace">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="breadcrumb-button"
              onClick={() => setView("cases")}
            >
              Início
            </button>
            <i>/</i>
            <strong>{title}</strong>
          </div>
          <div className="top-actions">
            <button className="help-button">Ajuda</button>
            <button className="icon-button">●</button>
          </div>
        </header>
        <section className="page">
          <div className="page-heading">
            <div>
              <p className="eyebrow">MÓDULO DE ERGONOMIA</p>
              <h1>{title}</h1>
              <p>{description}</p>
            </div>
            <button
              className="primary-button"
              onClick={() => open(view, "create")}
            >
              <Plus size={16} />{" "}
              {view === "cases"
                ? "Novo caso"
                : view === "companies"
                  ? "Nova empresa"
                  : "Nova condição"}
            </button>
          </div>
          {view === "cases" && <CaseMetrics items={caseItems} />}
          {view === "companies" && <CompanyOverview items={countedCompanies} />}
          {view === "conditions" && <ConditionSummary items={conditionItems} />}
          <section className="content-card">
            <div className="content-toolbar">
              <div>
                <h2>
                  {view === "cases"
                    ? "Casos registrados"
                    : view === "companies"
                      ? "Empresas cadastradas"
                      : "Condições cadastradas"}
                </h2>
                <p>Use a busca e os filtros para localizar um registro.</p>
              </div>
              <div className="toolbar-actions">
                <label className="search-box">
                  <Search size={14} />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Buscar por nome, CID ou atividade"
                  />
                </label>
                <button
                  className={`filter-button ${filterOpen ? "active" : ""}`}
                  onClick={() => setFilterOpen(!filterOpen)}
                >
                  Filtros {activeFilters > 0 && <b>{activeFilters}</b>}
                </button>
                <button
                  className="search-action"
                  onClick={() =>
                    setSearched((current) => ({ ...current, [view]: true }))
                  }
                >
                  <Search size={13} /> Pesquisar
                </button>
              </div>
            </div>
            {filterOpen && (
              <FilterPanel
                view={view}
                status={statusFilter}
                extra={extraFilter}
                companies={companyItems}
                cases={caseItems}
                conditions={conditionItems}
                multiA={multiFilterA}
                multiB={multiFilterB}
                selectA={selectFilterA}
                selectB={selectFilterB}
                onStatus={setStatusFilter}
                onExtra={setExtraFilter}
                onMultiA={setMultiFilterA}
                onMultiB={setMultiFilterB}
                onSelectA={setSelectFilterA}
                onSelectB={setSelectFilterB}
                clear={() => {
                  setStatusFilter("Todos");
                  setExtraFilter("Todos");
                  setMultiFilterA([]);
                  setMultiFilterB([]);
                  setSelectFilterA("Todos");
                  setSelectFilterB("Todos");
                }}
              />
            )}
            {!searched[view] && <SearchPrompt />}
            {searched[view] && view === "cases" && (
              <CaseList
                items={caseItems}
                query={query}
                status={statusFilter}
                company={extraFilter}
                diseases={multiFilterA}
                sectors={multiFilterB}
                activity={selectFilterA}
                onStatus={setStatusFilter}
                onOpen={open}
                onRemove={remove}
              />
            )}
            {searched[view] && view === "companies" && (
              <CompanyList
                items={countedCompanies}
                query={query}
                status={statusFilter}
                onOpen={open}
                onRemove={remove}
              />
            )}
            {searched[view] && view === "conditions" && (
              <ConditionList
                items={conditionItems}
                query={query}
                status={statusFilter}
                region={extraFilter}
                regions={multiFilterA}
                type={selectFilterA}
                side={selectFilterB}
                onOpen={open}
                onRemove={remove}
              />
            )}
          </section>
        </section>
      </main>
      {overlay && (
        <FullScreenForm
          overlay={overlay}
          cases={caseItems}
          companies={companyItems}
          conditions={conditionItems}
          onClose={() => setOverlay(null)}
          onNavigate={(next) => next ? open(next.entity, next.mode, next.id) : setOverlay(null)}
          onViewCompanyCases={(company) => {
            setView("cases");
            setExtraFilter(company);
            setOverlay(null);
          }}
          onRemove={remove}
          onSaveCase={(item) => {
            setCaseItems((items) =>
              items.some((caseItem) => caseItem.id === item.id)
                ? items.map((caseItem) =>
                    caseItem.id === item.id ? item : caseItem,
                  )
                : [item, ...items],
            );
            if (item.status === "Concluído") {
              setOverlay({ entity: "cases", mode: "index", id: item.id });
              showToast("Caso concluído e respostas salvas.");
            } else {
              setOverlay(null);
              showToast("Rascunho do caso salvo.");
            }
          }}
          onSaveCompany={(item, linked) => {
            const previousCompany = companyItems.find(
              (company) => company.id === item.id,
            );
            const editing = Boolean(previousCompany);
            if (
              editing &&
              !window.confirm("Confirmar as alterações da empresa?")
            )
              return;
            const sectorByCase = new Map(
              (item.sectors ?? []).flatMap((sector) =>
                sector.caseIds.map((caseId) => [caseId, sector.name] as const),
              ),
            );
            setCompanyItems((items) =>
              items.some((company) => company.id === item.id)
                ? items.map((company) =>
                    company.id === item.id ? item : company,
                  )
                : [item, ...items],
            );
            setCaseItems((items) =>
              items.map((caseItem) =>
                linked.includes(caseItem.id)
                  ? {
                      ...caseItem,
                      company: item.name,
                      sector: sectorByCase.get(caseItem.id) ?? "",
                      workflow: caseItem.workflow ? { ...caseItem.workflow, associatedCompany: true, company: item.name, associatedSector: sectorByCase.has(caseItem.id), sector: sectorByCase.get(caseItem.id) ?? "" } : undefined,
                    }
                  : previousCompany && caseItem.company === previousCompany.name
                    ? { ...caseItem, company: "", sector: "", workflow: caseItem.workflow ? { ...caseItem.workflow, associatedCompany: false, company: "", associatedSector: false, sector: "" } : undefined }
                    : caseItem,
              ),
            );
            setOverlay(null);
            showToast("Empresa salva com sucesso.");
          }}
          onSaveCondition={(item) => {
            const editing = conditionItems.some(
              (condition) => condition.id === item.id,
            );
            if (
              editing &&
              !window.confirm("Confirmar as alterações da doença ou lesão?")
            )
              return;
            setConditionItems((items) =>
              items.some((condition) => condition.id === item.id)
                ? items.map((condition) =>
                    condition.id === item.id ? item : condition,
                  )
                : [item, ...items],
            );
            setOverlay(null);
            showToast("Condição salva com sucesso.");
          }}
          onDeactivate={(id) => {
            const condition = conditionItems.find((item) => item.id === id);
            setConditionItems((items) =>
              items.map((item) =>
                item.id === id
                  ? { ...item, status: "Desativada" as ConditionStatus }
                  : item,
              ),
            );
            if (condition)
              setCaseItems((items) =>
                items.map((item) =>
                  (item.injury === condition.name || item.workflow?.conditions.some((entry) => entry.answers.COND03 === condition.name))
                    ? { ...item, status: "Desatualizado" as CaseStatus }
                    : item,
                ),
              );
            setOverlay(null);
            showToast(
              "Condição desativada; casos relacionados foram marcados como desatualizados.",
            );
          }}
        />
      )}
      {toast && (
        <div className="toast">
          <span>✓</span>
          {toast}
        </div>
      )}
    </div>
  );
}

function FilterPanel({
  view,
  status,
  extra,
  companies,
  cases,
  conditions,
  multiA,
  multiB,
  selectA,
  selectB,
  onStatus,
  onExtra,
  onMultiA,
  onMultiB,
  onSelectA,
  onSelectB,
  clear,
}: {
  view: View;
  status: string;
  extra: string;
  companies: CompanyItem[];
  cases: CaseItem[];
  conditions: ConditionItem[];
  multiA: string[];
  multiB: string[];
  selectA: string;
  selectB: string;
  onStatus: (value: string) => void;
  onExtra: (value: string) => void;
  onMultiA: (value: string[]) => void;
  onMultiB: (value: string[]) => void;
  onSelectA: (value: string) => void;
  onSelectB: (value: string) => void;
  clear: () => void;
}) {
  const statuses =
    view === "conditions"
      ? ["Todos", "Ativa", "Em cadastro", "Desativada"]
      : view === "cases"
        ? ["Todos", "Concluído", "Em cadastro", "Desatualizado"]
        : ["Todos"];
  const companyOptions = [
    "Todos",
    ...companies.map((item) => item.name),
    "Sem empresa",
  ];
  const unique = (values: string[]) => [...new Set(values.filter(Boolean))];
  const toggle = (items: string[], item: string) =>
    items.includes(item)
      ? items.filter((entry) => entry !== item)
      : [...items, item];
  return (
    <div className="filter-panel">
      <div className="filter-panel-head">
        <div>
          <strong>Filtros avançados</strong>
          <span>Os resultados são atualizados na hora.</span>
        </div>
        <button onClick={clear}>Limpar filtros</button>
      </div>
      <div className="filter-fields">
        <label className="filter-field">
          <span>Status</span>
          <select
            value={status}
            onChange={(event) => onStatus(event.target.value)}
          >
            {statuses.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        {view === "cases" && (
          <>
            <label className="filter-field">
              <span>Empresa</span>
              <select
                value={extra}
                onChange={(event) => onExtra(event.target.value)}
              >
                {companyOptions.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <MultiFilter
              label="Doença (múltipla; nome ou CID)"
              options={unique(
                conditions
                  .filter((item) => item.status === "Ativa")
                  .map((item) => item.name),
              )}
              selected={multiA}
              onToggle={(item) => onMultiA(toggle(multiA, item))}
            />
            <MultiFilter
              label="Setor (múltipla; depende da empresa)"
              options={unique(
                cases
                  .filter((item) => extra === "Todos" || item.company === extra)
                  .map((item) => item.sector ?? ""),
              )}
              selected={multiB}
              onToggle={(item) => onMultiB(toggle(multiB, item))}
            />
            <label className="filter-field">
              <span>Atividade principal</span>
              <select
                value={selectA}
                onChange={(event) => onSelectA(event.target.value)}
              >
                <option>Todos</option>
                {unique(
                  cases
                    .filter(
                      (item) =>
                        extra === "Todos" ||
                        item.company === extra ||
                        (extra === "Sem empresa" && !item.company),
                    )
                    .flatMap((item) => item.activity.split(", ")),
                ).map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
          </>
        )}
        {view === "conditions" && (
          <>
            <MultiFilter
              label="Região corporal (múltipla)"
              options={bodyRegions}
              selected={multiA}
              onToggle={(item) => onMultiA(toggle(multiA, item))}
            />
            <label className="filter-field">
              <span>Tipo da condição</span>
              <select
                value={selectA}
                onChange={(event) => onSelectA(event.target.value)}
              >
                <option>Todos</option>
                <option>Doença</option>
                <option>Lesão</option>
              </select>
            </label>
            <label className="filter-field">
              <span>Lateralidade</span>
              <select
                value={selectB}
                onChange={(event) => onSelectB(event.target.value)}
              >
                <option>Todos</option>
                <option>Direito</option>
                <option>Esquerdo</option>
                <option>Ambos</option>
                <option>Central</option>
                <option>Não se aplica</option>
              </select>
            </label>
          </>
        )}
      </div>
    </div>
  );
}

function MultiFilter({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="filter-field filter-field-wide">
      <span>{label}</span>
      <div className="filter-chip-list">
        {options.length ? (
          options.map((item) => (
            <button
              type="button"
              key={item}
              className={selected.includes(item) ? "selected" : ""}
              onClick={() => onToggle(item)}
            >
              {selected.includes(item) ? "✓ " : "+ "}
              {item}
            </button>
          ))
        ) : (
          <small>Nenhuma opção disponível</small>
        )}
      </div>
    </div>
  );
}

function CaseMetrics({ items }: { items: CaseItem[] }) {
  const completed = items.filter((item) => item.status === "Concluído").length;
  return (
    <div className="metric-grid">
      <article className="metric-card feature">
        <div>
          <span className="metric-label">CASOS CADASTRADOS</span>
          <strong>{items.length}</strong>
          <small>
            <b>{completed}</b> concluídos no diagnóstico
          </small>
        </div>
        <div className="metric-visual">
          <span />
          <span />
          <span />
          <span />
        </div>
      </article>
      <article className="metric-card">
        <span className="metric-label">EM CADASTRO</span>
        <strong>
          {items.filter((item) => item.status === "Em cadastro").length}
        </strong>
        <small>Podem ser retomados a qualquer momento</small>
      </article>
      <article className="metric-card">
        <span className="metric-label">ÍNDICE ELEVADO</span>
        <strong>{items.filter((item) => item.score >= 80).length}</strong>
        <small>Compatibilidade acima de 80%</small>
      </article>
      <article className="metric-card">
        <span className="metric-label">DESATUALIZADOS</span>
        <strong>
          {items.filter((item) => item.status === "Desatualizado").length}
        </strong>
        <small>Precisam de revisão</small>
      </article>
    </div>
  );
}
function CompanyOverview({ items }: { items: CompanyItem[] }) {
  return (
    <div className="company-overview">
      <div className="overview-copy">
        <span>
          <Building2 size={22} />
        </span>
        <div>
          <small>BASE ORGANIZACIONAL</small>
          <strong>{items.length} empresas acompanhadas</strong>
          <p>Indicadores agrupados para priorizar análises.</p>
        </div>
      </div>
      <div className="overview-stat">
        <span>Casos associados</span>
        <strong>{items.reduce((sum, item) => sum + item.total, 0)}</strong>
        <i>
          <b style={{ width: "76%" }} />
        </i>
      </div>
      <div className="overview-stat">
        <span>Casos prioritários</span>
        <strong className="red">
          {items.reduce((sum, item) => sum + item.priority, 0)}
        </strong>
        <p>Índice superior a 80%</p>
      </div>
    </div>
  );
}
function ConditionSummary({ items }: { items: ConditionItem[] }) {
  return (
    <div className="condition-summary">
      <div>
        <span className="summary-icon">
          <Activity size={20} />
        </span>
        <p>
          <small>CONDIÇÕES ATIVAS</small>
          <strong>
            {items.filter((item) => item.status === "Ativa").length}
          </strong>
        </p>
      </div>
      <div>
        <span className="summary-ring">{items.length}</span>
        <p>
          <small>NO CATÁLOGO</small>
          <strong>{items.length}</strong>
        </p>
      </div>
      <div className="body-regions">
        <span>REGIÕES MAIS USADAS</span>
        <p>
          {regions.slice(0, 4).map((region) => (
            <b key={region}>{region}</b>
          ))}
        </p>
      </div>
      <div className="clinical-note">
        <p>
          <strong>
            Condições desativadas tornam os casos relacionados desatualizados.
          </strong>
          <small>Essa regra está ativa neste protótipo.</small>
        </p>
      </div>
    </div>
  );
}

function CaseList({
  items,
  query,
  status,
  company,
  diseases,
  sectors,
  activity,
  onStatus,
  onOpen,
  onRemove,
}: {
  items: CaseItem[];
  query: string;
  status: string;
  company: string;
  diseases: string[];
  sectors: string[];
  activity: string;
  onStatus: (value: string) => void;
  onOpen: (entity: View, mode: Mode, id?: string) => void;
  onRemove: (entity: View, id: string) => void;
}) {
  const filtered = useMemo(
    () =>
      items.filter(
        (item) =>
          `${item.name} ${item.injury} ${item.cid} ${item.company} ${item.activity}`
            .toLowerCase()
            .includes(query.toLowerCase()) &&
          (status === "Todos" || item.status === status) &&
          (company === "Todos" ||
            (company === "Sem empresa"
              ? !item.company
              : item.company === company)) &&
          (!diseases.length || diseases.includes(item.injury)) &&
          (!sectors.length || sectors.includes(item.sector ?? "")) &&
          (activity === "Todos" ||
            item.activity.split(", ").includes(activity)),
      ),
    [items, query, status, company, diseases, sectors, activity],
  );
  return (
    <>
      <div className="quick-filters">
        <span>Status rápido:</span>
        {["Todos", "Concluído", "Em cadastro", "Desatualizado"].map((item) => (
          <button
            key={item}
            onClick={() => onStatus(item)}
            className={status === item ? "selected" : ""}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Trabalhador</th>
              <th>Condição</th>
              <th>Empresa</th>
              <th>Setor</th>
              <th>Atividade principal</th>
              <th>Status</th>
              <th>Índice</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id}>
                <td>
                  <div className="person-cell">
                    <span>{initials(item.name)}</span>
                    <div>
                      <strong>{item.name}</strong>
                      <small>{item.id}</small>
                    </div>
                  </div>
                </td>
                <td>
                  <strong className="table-main">{item.injury}</strong>
                  <small>{item.cid}</small>
                </td>
                <td>{item.company || "Sem empresa"}</td>
                <td>{item.sector || "—"}</td>
                <td>{item.activity}</td>
                <td>
                  <span className={statusClass(item.status)}>
                    {item.status}
                  </span>
                </td>
                <td>
                  <div className="score">
                    <strong>
                      {item.score || "—"}
                      {item.score ? "%" : ""}
                    </strong>
                    <span>
                      <i style={{ width: `${item.score}%` }} />
                    </span>
                  </div>
                </td>
                <td>
                  <RowActions
                    onView={() => onOpen("cases", "view", item.id)}
                    onEdit={() => onOpen("cases", "edit", item.id)}
                    onDelete={() => onRemove("cases", item.id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <Empty />}
      </div>
      <Footer count={filtered.length} />
    </>
  );
}
function CompanyList({
  items,
  query,
  onOpen,
  onRemove,
}: {
  items: CompanyItem[];
  query: string;
  status: string;
  onOpen: (entity: View, mode: Mode, id?: string) => void;
  onRemove: (entity: View, id: string) => void;
}) {
  const filtered = items.filter((item) =>
    item.name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="company-grid">
      {filtered.map((item) => (
        <article className="company-card" key={item.id}>
          <div className="company-head">
            <span className="company-avatar">{item.initials}</span>
            <RowActions
              onView={() => onOpen("companies", "view", item.id)}
              onEdit={() => onOpen("companies", "edit", item.id)}
              onDelete={() => onRemove("companies", item.id)}
            />
          </div>
          <h3>{item.name}</h3>
          <div>
            <small>{item.id}</small>
          </div>
          <div className="company-numbers">
            <span>
              CASOS<b>{item.total}</b>
            </span>
            <span>
              CONCLUÍDOS<b>{item.complete}</b>
            </span>
            <span>
              RASCUNHOS<b>{item.drafts}</b>
            </span>
          </div>
          <div className="company-score">
            <span>
              Compatibilidade média <b>{item.average}%</b>
            </span>
            <i>
              <b style={{ width: `${item.average}%` }} />
            </i>
          </div>
          <div className="company-footer">
            <span className={item.priority ? "priority" : ""}>
              {item.priority
                ? `${item.priority} prioritários`
                : "Sem prioridade"}
            </span>
            <div>
              <button onClick={() => onOpen("companies", "analytics", item.id)}>
                Análise
              </button>
              <button onClick={() => onOpen("companies", "view", item.id)}>
                Ver
              </button>
            </div>
          </div>
        </article>
      ))}
      {!filtered.length && <Empty />}
    </div>
  );
}
function ConditionList({
  items,
  query,
  status,
  region,
  regions,
  type,
  side,
  onOpen,
  onRemove,
}: {
  items: ConditionItem[];
  query: string;
  status: string;
  region: string;
  regions: string[];
  type: string;
  side: string;
  onOpen: (entity: View, mode: Mode, id?: string) => void;
  onRemove: (entity: View, id: string) => void;
}) {
  const filtered = items.filter(
    (item) =>
      `${item.name} ${item.cid} ${item.region}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (status === "Todos" || item.status === status) &&
      (region === "Todos" || item.region.includes(region)) &&
      (!regions.length ||
        regions.some((entry) => item.region.includes(entry))) &&
      (type === "Todos" || item.type === type) &&
      (side === "Todos" || item.side.includes(side)),
  );
  return (
    <>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Condição</th>
              <th>Tipo</th>
              <th>Região corporal</th>
              <th>Lado</th>
              <th>Status</th>
              <th>Casos</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id}>
                <td>
                  <div className="condition-cell">
                    <span>
                      <Activity size={15} />
                    </span>
                    <div>
                      <strong>{item.name}</strong>
                      <small>
                        {item.cid} · {item.id}
                      </small>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="type-chip">{item.type}</span>
                </td>
                <td>{item.region || "Não se aplica"}</td>
                <td>{sideLabel(item.side)}</td>
                <td>
                  <span className={statusClass(item.status)}>
                    {item.status}
                  </span>
                </td>
                <td>{item.cases}</td>
                <td>
                  <RowActions
                    onView={() => onOpen("conditions", "view", item.id)}
                    onEdit={() => onOpen("conditions", "edit", item.id)}
                    onDelete={() => onRemove("conditions", item.id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <Empty />}
      </div>
      <Footer count={filtered.length} />
    </>
  );
}
function RowActions({
  onView,
  onEdit,
  onDelete,
}: {
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="row-actions">
      <button title="Visualizar" onClick={onView}>
        <Eye size={14} />
      </button>
      <button title="Editar" onClick={onEdit}>
        <Edit3 size={13} />
      </button>
      <button title="Excluir" onClick={onDelete}>
        <Trash2 size={13} />
      </button>
    </div>
  );
}
function Empty() {
  return (
    <div className="empty-state">
      <Search size={22} />
      <strong>Nenhum resultado encontrado</strong>
      <span>Ajuste os filtros ou tente outra busca.</span>
    </div>
  );
}
function SearchPrompt() {
  return (
    <div className="search-prompt">
      <Search size={24} />
      <strong>Selecione pelo menos um campo de busca</strong>
      <span>
        Informe um termo ou filtro e use a ação “Pesquisar” para visualizar os
        resultados.
      </span>
    </div>
  );
}
function Footer({ count }: { count: number }) {
  return (
    <div className="table-footer">
      <span>
        {count} registro{count === 1 ? "" : "s"} encontrado
        {count === 1 ? "" : "s"}
      </span>
      <div>
        <button className="current">1</button>
      </div>
    </div>
  );
}

function CompatibilityIndex({ item }: { item: CaseItem }) {
  if (item.indexPending && item.status === "Concluído") return <section className="form-section"><h2>Caso concluído</h2><p>As respostas foram salvas. O percentual de compatibilidade aguarda a definição das regras XYZ/XXX mencionadas na US01.</p><h3>Dimensões consideradas</h3>{dimensions.map((dimension) => <p key={dimension.name}>{dimension.name}: aguardando fórmula</p>)}</section>;
  if (item.status !== "Concluído")
    return (
      <div className="index-unavailable">
        <AlertTriangle size={22} />
        <strong>Índice ainda não calculado</strong>
        <p>
          O índice de compatibilidade é calculado somente quando o caso está
          concluído.
        </p>
      </div>
    );
  const values = dimensions.map((dimension, index) => ({
    ...dimension,
    value: Math.max(0, Math.min(100, item.score + [4, -6, -14, -9, 2][index])),
  }));
  return (
    <div className="compatibility-page">
      <section className="compatibility-hero">
        <span>ÍNDICE DE COMPATIBILIDADE</span>
        <strong>{item.score}%</strong>
        <p>
          Correlação entre a condição alegada e as atividades de {item.name}.
        </p>
      </section>
      <section className="form-section">
        <SectionTitle
          icon={<Activity size={17} />}
          title="Dimensões consideradas"
          text="Valores de zero a cem calculados a partir das respostas do caso."
        />
        {values.map((dimension) => (
          <div className="dimension-row" key={dimension.name}>
            <span>
              {dimension.name}
              <b>{dimension.value}%</b>
            </span>
            <i>
              <b style={{ width: `${dimension.value}%` }} />
            </i>
          </div>
        ))}
        <p className="index-disclaimer">
          Este resultado mede compatibilidade e não determina culpa, causalidade
          ou nexo definitivo.
        </p>
      </section>
    </div>
  );
}

function ChangeHistory({ entity, itemId }: { entity: string; itemId: string }) {
  const history = JSON.parse(localStorage.getItem(`nexo-history-${itemId}`) ?? "[]") as { date: string; action: string; responsible: string; fields: string }[];
  return (
    <section className="form-section">
      <SectionTitle
        icon={<Edit3 size={17} />}
        title="Histórico de alterações"
        text={`Registro de mudanças do ${entity} ${itemId}.`}
      />
      <div className="history-list">
        {history.map((event, index) => <article key={`${event.date}-${index}`}><span>{event.date}</span><strong>{event.action}</strong><p>{event.responsible}</p>{event.fields && <p>Campos alterados: {event.fields}</p>}</article>)}
        {!history.length && <p>Não há alterações registradas para este cadastro.</p>}
      </div>
    </section>
  );
}

function FullScreenForm({
  overlay,
  cases,
  companies,
  conditions,
  onClose,
  onNavigate,
  onViewCompanyCases,
  onRemove,
  onSaveCase,
  onSaveCompany,
  onSaveCondition,
  onDeactivate,
}: {
  overlay: Exclude<Overlay, null>;
  cases: CaseItem[];
  companies: CompanyItem[];
  conditions: ConditionItem[];
  onClose: () => void;
  onNavigate: (overlay: Overlay) => void;
  onViewCompanyCases: (company: string) => void;
  onRemove: (entity: View, id: string) => void;
  onSaveCase: (item: CaseItem) => void;
  onSaveCompany: (item: CompanyItem, linked: string[]) => void;
  onSaveCondition: (item: ConditionItem) => void;
  onDeactivate: (id: string) => void;
}) {
  const item =
    overlay.entity === "cases"
      ? cases.find((entry) => entry.id === overlay.id)
      : overlay.entity === "companies"
        ? companies.find((entry) => entry.id === overlay.id)
        : conditions.find((entry) => entry.id === overlay.id);
  const label =
    overlay.entity === "cases"
      ? "CASO"
      : overlay.entity === "companies"
        ? "EMPRESA"
        : "CONDIÇÃO";
  const title =
    overlay.mode === "create"
      ? `Cadastrar ${label.toLowerCase()}`
      : overlay.mode === "analytics"
        ? "Análise da empresa"
        : overlay.mode === "index"
          ? "Índice de compatibilidade"
          : overlay.mode === "history"
            ? "Histórico de alterações"
            : overlay.mode === "edit"
              ? `Editar ${label.toLowerCase()}`
              : `Detalhes do ${label.toLowerCase()}`;
  return (
    <div className="overlay">
      <div className="drawer wide fullscreen-drawer">
        <header className="drawer-header">
          <div>
            <button onClick={onClose}>
              <ChevronLeft size={18} />
            </button>
            <div>
              <span>
                {label} ·{" "}
                {overlay.mode === "create"
                  ? "NOVO REGISTRO"
                  : overlay.mode.toUpperCase()}
              </span>
              <h2>{title}</h2>
            </div>
          </div>
          <button onClick={onClose}>
            <X size={17} />
          </button>
        </header>
        <div className="drawer-body">
          <div className="full-form-shell">
            {overlay.mode === "analytics" && item && (
              <CompanyAnalysis name={(item as CompanyItem).name} cases={cases} />
            )}
            {overlay.mode === "index" && item && (
              <CompatibilityIndex item={item as CaseItem} />
            )}
            {overlay.mode === "history" && item && (
              <ChangeHistory entity={label.toLowerCase()} itemId={item.id} />
            )}
            {overlay.entity === "cases" &&
              ["create", "edit", "view"].includes(overlay.mode) && (
                <CaseForm
                  item={item as CaseItem | undefined}
                  mode={overlay.mode as "create" | "edit" | "view"}
                  companies={companies}
                  conditions={conditions}
                  onSave={onSaveCase}
                />
              )}
            {overlay.entity === "companies" &&
              ["create", "edit", "view"].includes(overlay.mode) && (
                <CompanyForm
                  item={item as CompanyItem | undefined}
                  mode={overlay.mode as "create" | "edit" | "view"}
                  cases={cases}
                  onSave={onSaveCompany}
                />
              )}
            {overlay.entity === "conditions" &&
              ["create", "edit", "view"].includes(overlay.mode) && (
                <ConditionForm
                  item={item as ConditionItem | undefined}
                  mode={overlay.mode as "create" | "edit" | "view"}
                  onSave={onSaveCondition}
                />
              )}
          </div>
        </div>
        {!["analytics", "index", "history"].includes(overlay.mode) && (
          <footer className="drawer-footer">
            {overlay.mode !== "create" &&
              overlay.mode !== "view" &&
              overlay.entity === "conditions" &&
              item && (
                <button
                  className="ghost-button danger-button"
                  onClick={() => onDeactivate(item.id)}
                >
                  Desativar condição
                </button>
              )}
            {overlay.mode === "view" && item && (
              <>
                <button
                  className="ghost-button"
                  onClick={() => onRemove(overlay.entity, item.id)}
                >
                  Excluir
                </button>
                <button className="secondary-button" onClick={() => onClose()}>
                  Fechar
                </button>
                <button
                  className="secondary-button"
                  onClick={() =>
                    onNavigate({
                      entity: overlay.entity,
                      mode: "history",
                      id: item.id,
                    })
                  }
                >
                  Histórico de alterações
                </button>
                {overlay.entity === "companies" && (
                  <button
                    className="secondary-button"
                    onClick={() =>
                      onViewCompanyCases((item as CompanyItem).name)
                    }
                  >
                    Ver casos
                  </button>
                )}
                {overlay.entity === "companies" && (
                  <button
                    className="secondary-button"
                    onClick={() =>
                      onNavigate({
                        entity: "companies",
                        mode: "analytics",
                        id: item.id,
                      })
                    }
                  >
                    Análise da empresa
                  </button>
                )}
                {overlay.entity === "cases" &&
                  (item as CaseItem).status !== "Desatualizado" && (
                    <button
                      className="secondary-button"
                      onClick={() =>
                        onNavigate({
                          entity: "cases",
                          mode: "index",
                          id: item.id,
                        })
                      }
                    >
                      Ver índice de compatibilidade
                    </button>
                  )}
                <button
                  className="primary-button"
                  onClick={() =>
                    onNavigate({
                      entity: overlay.entity,
                      mode: "edit",
                      id: item.id,
                    })
                  }
                >
                  Editar
                </button>
              </>
            )}
            <FormSubmit mode={overlay.mode} entity={overlay.entity} />
          </footer>
        )}
      </div>
    </div>
  );
}
function FormSubmit({ mode, entity }: { mode: Mode; entity: View }) {
  return (
    <>
      {mode !== "view" && (
        <>
          <button
            className="secondary-button"
            type="submit"
            form={`${entity}-form`}
            name="draft"
            value="true"
          >
            Salvar rascunho
          </button>
          <button
            className="primary-button"
            type="submit"
            form={`${entity}-form`}
          >
            {mode === "edit" ? "Salvar alterações" : "Concluir cadastro"}
          </button>
        </>
      )}
    </>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function LegacyCaseForm({
  item,
  mode,
  companies,
  conditions,
  onSave,
}: {
  item?: CaseItem;
  mode: Mode;
  companies: CompanyItem[];
  conditions: ConditionItem[];
  onSave: (item: CaseItem) => void;
}) {
  const readOnly = mode === "view";
  const [name, setName] = useState(item?.name ?? "");
  const [linked, setLinked] = useState(Boolean(item?.company));
  const [company, setCompany] = useState(item?.company ?? "");
  const [condition, setCondition] = useState(item?.injury ?? "");
  const [activities, setActivities] = useState<ActivityDraft[]>([
    { id: "activity-1", name: item?.activity ?? "", hours: 4 },
  ]);
  const [timeline, setTimeline] = useState([
    { id: "1", date: "Hoje", text: "Entrevista inicial registrada" },
  ]);
  const availableActivities = company
    ? (activityByCompany[company] ?? noCompanyActivities)
    : noCompanyActivities;
  const updateActivity = (id: string, patch: Partial<ActivityDraft>) =>
    setActivities((items) =>
      items.map((activity) =>
        activity.id === id ? { ...activity, ...patch } : activity,
      ),
    );
  const maxHours = Math.max(...activities.map((activity) => activity.hours));
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      !name.trim() ||
      !condition ||
      !activities.every((activity) => activity.name)
    )
      return;
    const selected = conditions.find((entry) => entry.name === condition);
    const draft = (event.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null;
    onSave({
      id: item?.id ?? `CAS-${String(Date.now()).slice(-4)}`,
      name: name.trim(),
      injury: condition,
      cid: selected?.cid ?? "",
      company: linked ? company : "",
      activity: activities
        .filter((activity) => activity.hours === maxHours)
        .map((activity) => activity.name)
        .join(", "),
      status: draft?.value === "true" ? "Em cadastro" : "Concluído",
      score: item?.score ?? 74,
    });
  };
  return (
    <form id="cases-form" onSubmit={submit}>
      <div className="stepper">
        <button className="active">
          <span>1</span>Identificação
        </button>
        <button className="active">
          <span>2</span>Exposição
        </button>
        <button className="active">
          <span>3</span>Histórico
        </button>
      </div>
      <section className="form-section">
        <SectionTitle
          icon={<ClipboardList size={17} />}
          title="Identificação do caso"
          text="Campos obrigatórios para iniciar a avaliação."
        />
        <div className="form-grid">
          <Field label="Nome do trabalhador" required>
            <input
              disabled={readOnly}
              maxLength={255}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nome completo"
            />
          </Field>
          <Field label="Condição / doença ou lesão" required>
            <select
              disabled={readOnly}
              value={condition}
              onChange={(event) => setCondition(event.target.value)}
            >
              <option value="">Selecione uma condição ativa</option>
              {conditions
                .filter(
                  (entry) =>
                    entry.status === "Ativa" || entry.name === condition,
                )
                .map((entry) => (
                  <option key={entry.id}>{entry.name}</option>
                ))}
            </select>
          </Field>
        </div>
        <Toggle
          label="Esse caso é associado a alguma empresa?"
          text="Quando informado, as atividades disponíveis dependem da empresa."
          value={linked}
          disabled={readOnly}
          onChange={() => {
            setLinked(!linked);
            setCompany("");
          }}
        />
        {linked && (
          <Field label="Empresa" required>
            <select
              disabled={readOnly}
              value={company}
              onChange={(event) => {
                setCompany(event.target.value);
                setActivities([{ id: "activity-1", name: "", hours: 4 }]);
              }}
            >
              <option value="">Selecione a empresa</option>
              {companies.map((entry) => (
                <option key={entry.id}>{entry.name}</option>
              ))}
            </select>
          </Field>
        )}
      </section>
      <section className="form-section spaced">
        <SectionTitle
          icon={<Activity size={17} />}
          title="Atividades e duração"
          text="Adicione uma ou mais atividades. A de maior duração é marcada como principal."
        />
        {activities.map((activity, index) => (
          <article className="activity-editor" key={activity.id}>
            <div className="activity-editor-head">
              <strong>
                Atividade {index + 1}
                {activity.hours === maxHours ? (
                  <em>Atividade principal</em>
                ) : null}
              </strong>
              {activities.length > 1 && !readOnly && (
                <button
                  type="button"
                  onClick={() =>
                    setActivities((items) =>
                      items.filter((entry) => entry.id !== activity.id),
                    )
                  }
                >
                  <Trash2 size={14} /> Remover
                </button>
              )}
            </div>
            <div className="form-grid">
              <Field label="Atividade" required>
                <select
                  disabled={readOnly}
                  value={activity.name}
                  onChange={(event) =>
                    updateActivity(activity.id, { name: event.target.value })
                  }
                >
                  <option value="">Selecione a atividade</option>
                  {availableActivities.map((entry) => (
                    <option key={entry}>{entry}</option>
                  ))}
                </select>
              </Field>
              <Field label="Duração selecionada">
                <input
                  disabled={readOnly}
                  type="number"
                  min="1"
                  max="8"
                  step="0.25"
                  value={activity.hours}
                  onChange={(event) =>
                    updateActivity(activity.id, {
                      hours: Math.max(
                        1,
                        Math.min(8, Number(event.target.value)),
                      ),
                    })
                  }
                />
              </Field>
            </div>
            <div className="duration-question">
              <span>PERGUNTA DE EXPOSIÇÃO</span>
              <strong>Por quanto tempo você consegue realizar a tarefa?</strong>
              <p>
                Selecione de 1 a 8 horas. Valores quebrados são aceitos em
                intervalos de 15 minutos.
              </p>
              <div className="duration-control">
                <input
                  disabled={readOnly}
                  type="range"
                  min="1"
                  max="8"
                  step="0.25"
                  value={activity.hours}
                  onChange={(event) =>
                    updateActivity(activity.id, {
                      hours: Number(event.target.value),
                    })
                  }
                />
                <output>{formatHours(activity.hours)}</output>
              </div>
              <div className="duration-scale">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((hour) => (
                  <span key={hour}>{hour}h</span>
                ))}
              </div>
            </div>
          </article>
        ))}
        {!readOnly && (
          <button
            className="secondary-button"
            type="button"
            onClick={() =>
              setActivities((items) => [
                ...items,
                { id: `activity-${Date.now()}`, name: "", hours: 4 },
              ])
            }
          >
            <Plus size={13} /> Adicionar atividade
          </button>
        )}
      </section>
      <section className="form-section spaced">
        <SectionTitle
          icon={<FilePlus2 size={17} />}
          title="Linha do tempo"
          text="Registre eventos relevantes para este caso."
        />
        {timeline.map((entry) => (
          <div className="timeline-edit" key={entry.id}>
            <input
              disabled={readOnly}
              value={entry.date}
              onChange={(event) =>
                setTimeline((items) =>
                  items.map((item) =>
                    item.id === entry.id
                      ? { ...item, date: event.target.value }
                      : item,
                  ),
                )
              }
            />
            <input
              disabled={readOnly}
              value={entry.text}
              onChange={(event) =>
                setTimeline((items) =>
                  items.map((item) =>
                    item.id === entry.id
                      ? { ...item, text: event.target.value }
                      : item,
                  ),
                )
              }
            />
            {!readOnly && (
              <button
                type="button"
                onClick={() =>
                  setTimeline((items) =>
                    items.filter((item) => item.id !== entry.id),
                  )
                }
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        ))}
        {!readOnly && (
          <button
            className="secondary-button"
            type="button"
            onClick={() =>
              setTimeline((items) => [
                ...items,
                { id: String(Date.now()), date: "Hoje", text: "" },
              ])
            }
          >
            <Plus size={13} /> Adicionar evento
          </button>
        )}
      </section>
    </form>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function LegacyCompanyForm({
  item,
  mode,
  cases,
  onSave,
}: {
  item?: CompanyItem;
  mode: Mode;
  cases: CaseItem[];
  onSave: (item: CompanyItem, linked: string[]) => void;
}) {
  const readOnly = mode === "view";
  const [name, setName] = useState(item?.name ?? "");
  const [hasPrevious, setHasPrevious] = useState(Boolean(item));
  const [linked, setLinked] = useState<string[]>(
    item
      ? cases
          .filter((entry) => entry.company === item.name)
          .map((entry) => entry.id)
      : [],
  );
  const eligible = cases.filter(
    (entry) => !entry.company || linked.includes(entry.id),
  );
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) return;
    const draft = (event.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null;
    onSave(
      {
        id: item?.id ?? `EMP-${String(Date.now()).slice(-4)}`,
        name: name.trim(),
        initials: initials(name),
        total: linked.length,
        complete: linked.filter(
          (id) =>
            cases.find((entry) => entry.id === id)?.status === "Concluído",
        ).length,
        drafts: linked.filter(
          (id) =>
            cases.find((entry) => entry.id === id)?.status === "Em cadastro",
        ).length,
        average: item?.average ?? 0,
        priority: item?.priority ?? 0,
      },
      hasPrevious ? linked : [],
    );
    if (draft?.value === "true") return;
  };
  return (
    <form id="companies-form" onSubmit={submit}>
      <section className="form-section">
        <SectionTitle
          icon={<Building2 size={17} />}
          title="Dados da empresa"
          text="O nome fantasia identifica a empresa nos casos."
        />
        <Field label="Nome fantasia" required>
          <input
            disabled={readOnly}
            maxLength={255}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex.: NEXO Indústria"
          />
        </Field>
        <Toggle
          label="A empresa possui algum caso associado anteriormente?"
          text="Ao selecionar sim, são exibidos apenas casos ainda sem empresa vinculada."
          value={hasPrevious}
          disabled={readOnly}
          onChange={() => setHasPrevious(!hasPrevious)}
        />
        {hasPrevious && (
          <div className="case-linker">
            <label>Casos sem empresa vinculada</label>
            {eligible.length ? (
              eligible.map((entry) => (
                <button
                  disabled={readOnly}
                  type="button"
                  className={linked.includes(entry.id) ? "selected" : ""}
                  key={entry.id}
                  onClick={() =>
                    setLinked((items) =>
                      items.includes(entry.id)
                        ? items.filter((id) => id !== entry.id)
                        : [...items, entry.id],
                    )
                  }
                >
                  <span>{linked.includes(entry.id) ? "✓" : "+"}</span>
                  <div>
                    <strong>{entry.name}</strong>
                    <small>
                      {entry.injury} · {entry.id}
                    </small>
                  </div>
                </button>
              ))
            ) : (
              <p>Nenhum caso disponível para vínculo.</p>
            )}
          </div>
        )}
      </section>
      {item && (
        <section className="form-section spaced">
          <SectionTitle
            icon={<Activity size={17} />}
            title="Resumo da empresa"
            text="Indicadores atualizados durante esta sessão do protótipo."
          />
          <div className="read-stats">
            <span>
              <small>CASOS</small>
              <strong>{item.total}</strong>
            </span>
            <span>
              <small>CONCLUÍDOS</small>
              <strong>{item.complete}</strong>
            </span>
            <span>
              <small>COMPATIBILIDADE</small>
              <strong>{item.average}%</strong>
            </span>
          </div>
        </section>
      )}
    </form>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function LegacyConditionForm({
  item,
  mode,
  onSave,
}: {
  item?: ConditionItem;
  mode: Mode;
  onSave: (item: ConditionItem) => void;
}) {
  const readOnly = mode === "view";
  const [name, setName] = useState(item?.name ?? "");
  const [type, setType] = useState(item?.type ?? "Doença");
  const [cid, setCid] = useState(item?.cid ?? "");
  const [revision, setRevision] = useState("1.0");
  const [release, setRelease] = useState("2026-09-08");
  const [affectsRegion, setAffectsRegion] = useState(Boolean(item?.region));
  const [selectedRegions, setSelectedRegions] = useState(
    item?.region ? item.region.split(", ") : [],
  );
  const [moreQuestions, setMoreQuestions] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const resizeOptions = (id: string, quantity: number) =>
    setQuestions((items) =>
      items.map((question) =>
        question.id === id
          ? {
              ...question,
              options: Array.from(
                { length: Math.max(1, quantity) },
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
    if (!name.trim() || !cid.trim() || !revision || !release) return;
    const draft = (event.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null;
    onSave({
      id: item?.id ?? `CON-${String(Date.now()).slice(-4)}`,
      name: name.trim(),
      type,
      cid: cid.trim(),
      region: affectsRegion ? selectedRegions.join(", ") : "",
      side: affectsRegion ? "Bilateral" : "",
      status: draft?.value === "true" ? "Em cadastro" : "Ativa",
      cases: item?.cases ?? 0,
    });
  };
  return (
    <form id="conditions-form" onSubmit={submit}>
      <section className="form-section">
        <SectionTitle
          icon={<Activity size={17} />}
          title="Dados clínicos"
          text="Campos usados para identificar a condição no catálogo."
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
          <Field label="Tipo" required>
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
          <Field label="CID" required>
            <input
              disabled={readOnly}
              maxLength={20}
              value={cid}
              onChange={(event) => setCid(event.target.value)}
              placeholder="Ex.: M75.1"
            />
          </Field>
          <Field label="Revisão / liberação" required>
            <div className="split-input">
              <input
                disabled={readOnly}
                value={revision}
                onChange={(event) => setRevision(event.target.value)}
              />
              <input
                disabled={readOnly}
                type="date"
                value={release}
                onChange={(event) => setRelease(event.target.value)}
              />
            </div>
          </Field>
        </div>
        <Toggle
          label="Esta condição afeta alguma região corporal?"
          text="Disponibiliza o filtro por região no catálogo."
          value={affectsRegion}
          disabled={readOnly}
          onChange={() => setAffectsRegion(!affectsRegion)}
        />
        {affectsRegion && (
          <div className="region-pills">
            {regions.map((region) => (
              <button
                disabled={readOnly}
                type="button"
                className={selectedRegions.includes(region) ? "selected" : ""}
                key={region}
                onClick={() =>
                  setSelectedRegions((items) =>
                    items.includes(region)
                      ? items.filter((entry) => entry !== region)
                      : [...items, region],
                  )
                }
              >
                {selectedRegions.includes(region) ? "✓ " : "+ "}
                {region}
              </button>
            ))}
          </div>
        )}
      </section>
      <section className="form-section spaced">
        <SectionTitle
          icon={<FilePlus2 size={17} />}
          title="Perguntas complementares"
          text="As perguntas aparecem no preenchimento do caso."
        />
        <Toggle
          label="Adicionar mais perguntas?"
          text="Ative para configurar perguntas e pesos de resposta."
          value={moreQuestions}
          disabled={readOnly}
          onChange={() => setMoreQuestions(!moreQuestions)}
        />
        {moreQuestions && (
          <div className="question-stack">
            {questions.map((question, index) => (
              <div className="question-builder" key={question.id}>
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
                  <Field label="Título da pergunta" required>
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
                  <Field label="Tipo de resposta">
                    <select
                      disabled={readOnly}
                      value={question.type}
                      onChange={(event) =>
                        setQuestions((items) =>
                          items.map((entry) =>
                            entry.id === question.id
                              ? {
                                  ...entry,
                                  type: event.target.value as Question["type"],
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
                  <Field label="Peso da pergunta (0 a 100)">
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
                    <Field label="Quantidade de opções">
                      <input
                        disabled={readOnly}
                        type="number"
                        min="1"
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
                          placeholder="Rótulo da opção"
                          onChange={(event) =>
                            setQuestions((items) =>
                              items.map((entry) =>
                                entry.id === question.id
                                  ? {
                                      ...entry,
                                      options: entry.options.map(
                                        (entryOption) =>
                                          entryOption.id === option.id
                                            ? {
                                                ...entryOption,
                                                label: event.target.value,
                                              }
                                            : entryOption,
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
                          onChange={(event) =>
                            setQuestions((items) =>
                              items.map((entry) =>
                                entry.id === question.id
                                  ? {
                                      ...entry,
                                      options: entry.options.map(
                                        (entryOption) =>
                                          entryOption.id === option.id
                                            ? {
                                                ...entryOption,
                                                weight: Number(
                                                  event.target.value,
                                                ),
                                              }
                                            : entryOption,
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
              </div>
            ))}
            {!readOnly && (
              <button
                className="secondary-button"
                type="button"
                onClick={() =>
                  setQuestions((items) => [
                    ...items,
                    {
                      id: String(Date.now()),
                      title: "",
                      type: "Seleção simples",
                      weight: 0,
                      options: [
                        { id: `${Date.now()}-0`, label: "", weight: 0 },
                        { id: `${Date.now()}-1`, label: "", weight: 0 },
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
            icon={<Edit3 size={17} />}
            title="Rastreabilidade"
            text="Informações disponíveis na visualização da condição."
          />
          <div className="read-stats">
            <span>
              <small>ÚLTIMA ALTERAÇÃO</small>
              <strong>Hoje</strong>
            </span>
            <span>
              <small>RESPONSÁVEL</small>
              <strong>Gabriel</strong>
            </span>
            <span>
              <small>CASOS</small>
              <strong>{item.cases}</strong>
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
  text,
  value,
  disabled,
  onChange,
}: {
  label: string;
  text: string;
  value: boolean;
  disabled: boolean;
  onChange: () => void;
}) {
  return (
    <div className="switch-row">
      <div>
        <strong>{label}</strong>
        <span>{text}</span>
      </div>
      <button
        className={`switch ${value ? "on" : ""}`}
        type="button"
        disabled={disabled}
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function Analytics({
  item,
  onClose,
}: {
  item: CompanyItem;
  onClose: () => void;
}) {
  return (
    <div className="analytics">
      <section className="analytics-hero">
        <div>
          <span>COMPATIBILIDADE MÉDIA</span>
          <strong>{item.average}%</strong>
          <small>Indicador consolidado de {item.name}</small>
        </div>
        <div className="distribution">
          {[32, 48, 67, 82, 58, 75, 91, 69].map((value, index) => (
            <i key={index} style={{ height: `${value}%` }}>
              <b>{value}</b>
            </i>
          ))}
        </div>
      </section>
      <div className="analytics-grid">
        <section>
          <h3>Dimensões avaliadas</h3>
          {dimensions.map((dimension) => (
            <div className="dimension-row" key={dimension.name}>
              <span>
                {dimension.name}
                <b>{dimension.value}%</b>
              </span>
              <i>
                <b style={{ width: `${dimension.value}%` }} />
              </i>
            </div>
          ))}
        </section>
        <section>
          <h3>Condições mais frequentes</h3>
          <ol>
            <li>
              <span>1</span>
              <div>
                <strong>Síndrome do manguito rotador</strong>
                <small>5 casos associados</small>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <strong>Dor lombar baixa</strong>
                <small>4 casos associados</small>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <strong>Síndrome do túnel do carpo</strong>
                <small>3 casos associados</small>
              </div>
            </li>
          </ol>
        </section>
      </div>
      <div className="priority-callout">
        <span>
          <AlertTriangle size={18} />
        </span>
        <div>
          <strong>{item.priority} caso(s) prioritário(s)</strong>
          <p>Índice de compatibilidade superior a 80%.</p>
        </div>
        <button onClick={onClose}>Voltar</button>
      </div>
    </div>
  );
}
function formatHours(value: number) {
  const hours = Math.floor(value);
  const minutes = Math.round((value - hours) * 60);
  return minutes
    ? `${hours}h ${minutes.toString().padStart(2, "0")}min`
    : `${hours}h`;
}
