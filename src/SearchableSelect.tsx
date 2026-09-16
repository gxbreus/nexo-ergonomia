import { useId, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';

export type SelectOption = { value: string; label: string; description?: string };
type Props = {
  label: string;
  options: SelectOption[];
  value: string | string[];
  onChange: (values: string[]) => void;
  multiple?: boolean;
  disabled?: boolean;
  placeholder?: string;
};
const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function SearchableSelect({ label, options, value, onChange, multiple = false, disabled = false, placeholder = 'Selecione', }: Props) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const selected = Array.isArray(value) ? value : value ? [value] : [];
  const matches = options.filter((option) => normalize(`${option.label} ${option.description ?? ''}`).includes(normalize(query)));
  const openAndFocus = () => {
    if (disabled) return;
    setOpen(true);
    setActive(0);
    requestAnimationFrame(() => input.current?.focus());
  };
  const choose = (option: SelectOption) => {
    onChange(multiple ? selected.includes(option.value) ? selected.filter((entry) => entry !== option.value) : [...selected, option.value] : [option.value]);
    setQuery(''); setActive(0);
    if (!multiple) setOpen(false);
    if (multiple) input.current?.focus();
    else toggle.current?.focus();
  };
  return <div className={`searchable-select ${open && !disabled ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''}`}
    onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) { setOpen(false); setQuery(''); } }}>
      <div className="selection-control">
        <div className="selection-values">
          {selected.map((entry) => {
            const selectedLabel = options.find((option) => option.value === entry)?.label ?? entry;
            if (!multiple && !open && !disabled) return <button className="selection-single selection-single-trigger" type="button" key={entry} aria-label={`Alterar ${label}: ${selectedLabel}`} aria-haspopup="listbox" aria-expanded={false} onClick={openAndFocus}>{selectedLabel}</button>;
            return <span className={multiple ? 'selection-chip' : 'selection-single'} key={entry}>
              {selectedLabel}
              {multiple && !disabled && <button type="button" aria-label={`Remover ${selectedLabel}`} onClick={() => onChange(selected.filter((item) => item !== entry))}><X size={12} /></button>}
            </span>;
          })}
          {(multiple || !selected.length || open) && <input ref={input} role="combobox" aria-label={label} aria-expanded={open && !disabled} aria-controls={`${id}-list`} aria-autocomplete="list"
            aria-activedescendant={open && matches.length ? `${id}-option-${Math.min(active, matches.length - 1)}` : undefined}
            disabled={disabled} autoComplete="off" placeholder={selected.length ? 'Pesquisar…' : placeholder}
            value={query} onFocus={() => { setOpen(true); setActive(0); }} onClick={() => setOpen(true)}
            onChange={(event) => { setQuery(event.target.value); setActive(0); setOpen(true); }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); setActive((current) => matches.length ? !open ? event.key === 'ArrowDown' ? 0 : matches.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length : 0); }
              if (event.key === 'Enter') { event.preventDefault(); if (open && matches.length) choose(matches[Math.min(active, matches.length - 1)]); else setOpen(true); }
              if (event.key === 'Escape') { event.preventDefault(); setOpen(false); setQuery(''); toggle.current?.focus(); }
            }} />}
        </div>
      {!!selected.length && !multiple && !disabled && <button className="selection-clear" type="button" aria-label={`Limpar ${label}`} onClick={() => { onChange([]); requestAnimationFrame(() => input.current?.focus()); }}><X size={14} /></button>}
      <button ref={toggle} type="button" className="selection-toggle" disabled={disabled} aria-label={`${open ? 'Fechar' : 'Abrir'} opções de ${label}`} aria-haspopup="listbox" aria-expanded={open && !disabled} onClick={() => { if (open) { setOpen(false); setQuery(''); } else openAndFocus(); }}><ChevronDown size={16} /></button>
    </div>
    {open && !disabled && <div className="selection-popup">
      <div className="selection-hint"><Search size={13} aria-hidden="true" /> Digite para pesquisar{multiple ? ' · Selecione um ou mais itens' : ''}</div>
      <div id={`${id}-list`} role="listbox" aria-label={`Opções de ${label}`} aria-multiselectable={multiple}>
        {matches.map((option, index) => <button id={`${id}-option-${index}`} key={option.value} type="button" role="option" aria-selected={selected.includes(option.value)}
          className={`selection-option ${active === index ? 'is-active' : ''}`} onMouseDown={(event) => event.preventDefault()} onMouseEnter={() => setActive(index)} onClick={() => choose(option)}>
          <span><strong>{option.label}</strong>{option.description && <small>{option.description}</small>}</span>
          {selected.includes(option.value) && <Check size={16} aria-hidden="true" />}
        </button>)}
        {!matches.length && <p className="selection-empty">Nenhuma opção encontrada.</p>}
      </div>
    </div>}
  </div>;
}
