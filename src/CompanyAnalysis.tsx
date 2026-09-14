import type { CaseWorkflowRecord } from './CaseWorkflow';

export function CompanyAnalysis({ name, cases }: { name: string; cases: CaseWorkflowRecord[] }) {
  const linked = cases.filter((item) => item.company === name);
  const scored = linked.filter((item) => item.status === 'Concluído' && !item.indexPending && !item.workflow);
  const scores = scored.map((item) => item.score).sort((a, b) => a - b);
  const middle = Math.floor(scores.length / 2);
  const median = scores.length ? scores.length % 2 ? scores[middle] : (scores[middle - 1] + scores[middle]) / 2 : null;
  const average = scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : null;
  const frequency = (field: 'injury' | 'activity') => {
    const groups = new Map<string, CaseWorkflowRecord[]>();
    for (const item of linked) {
      const names = field === 'activity' ? item.workflow?.activities.map((activity) => activity.name) ?? item.activity.split(', ') : [item.injury];
      for (const value of new Set(names.filter(Boolean))) groups.set(value, [...(groups.get(value) ?? []), item]);
    }
    return [...groups.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 3);
  };
  const format = (value: number | null) => value === null ? '—' : `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
  return <div className="analytics">
    <section className="form-section"><h2>{name}</h2><div className="read-stats"><span><small>ÍNDICE MÉDIO</small><strong>{format(average)}</strong></span><span><small>MEDIANA</small><strong>{format(median)}</strong></span><span><small>CASOS ASSOCIADOS</small><strong>{linked.length}</strong></span></div><p>Os percentuais existentes são exemplos demonstrativos. Novos casos aguardam a definição da fórmula de compatibilidade.</p></section>
    <section className="form-section"><h3>Distribuição dos índices</h3>{scores.length ? <table><thead><tr><th>Índice</th><th>Quantidade de casos</th></tr></thead><tbody>{[...new Set(scores)].map((score) => <tr key={score}><td>{score}%</td><td>{scores.filter((value) => value === score).length}</td></tr>)}</tbody></table> : <p>Nenhum caso com índice disponível.</p>}</section>
    <div className="analytics-grid">{(['injury', 'activity'] as const).map((field) => <section key={field}><h3>{field === 'injury' ? 'Doenças mais frequentes' : 'Atividades com mais casos associados'}</h3>{frequency(field).map(([label, items]) => <article key={label}><h4>{label}</h4><p>{items.length} caso(s)</p><p>{items.map((item) => item.name).join(' · ')}</p></article>)}{!linked.length && <p>Nenhum caso associado.</p>}</section>)}</div>
    <section className="form-section"><h3>Valores médios das dimensões</h3><p>Aguardando a definição das fórmulas das dimensões na US01.</p></section>
    <section className="form-section"><h3>Casos prioritários — índice maior que 80</h3>{scored.filter((item) => item.score > 80).map((item) => <article key={item.id}><h4>{item.name}</h4><p>{item.injury}</p><p>Atividade principal: {item.activity}</p></article>)}{!scored.some((item) => item.score > 80) && <p>Nenhum caso prioritário com índice disponível.</p>}</section>
  </div>;
}
