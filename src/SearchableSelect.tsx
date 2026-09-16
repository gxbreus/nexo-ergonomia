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
  allowCustom?: boolean;
  customOptionLabel?: string;
  customInputLabel?: string;
};
const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const customOptionValue = '__searchable_select_other__';

export function SearchableSelect({ label, options, value, onChange, multiple = false, disabled = false, placeholder = 'Selecione', allowCustom = true, customOptionLabel = 'Outro', customInputLabel, }: Props) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const customInput = useRef<HTMLInputElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [addingCustom, setAddingCustom] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const selected = Array.isArray(value) ? value : value ? [value] : [];
  const matches = options.filter((option) => normalize(`${option.label} ${option.description ?? ''}`).includes(normalize(query)));
  const availableOptions = allowCustom ? [...matches, { value: customOptionValue, label: customOptionLabel, description: 'Informar uma opção não cadastrada' }] : matches;
  const openAndFocus = () => {
    if (disabled) return;
    setOpen(true);
    setActive(0);
    setAddingCustom(false);
    requestAnimationFrame(() => input.current?.focus());
  };
  const choose = (option: SelectOption) => {
    if (allowCustom && option.value === customOptionValue) {
      setAddingCustom(true);
      setQuery('');
      requestAnimationFrame(() => customInput.current?.focus());
      return;
    }
    onChange(multiple ? selected.includes(option.value) ? selected.filter((entry) => entry !== option.value) : [...selected, option.value] : [option.value]);
    setQuery(''); setActive(0); setAddingCustom(false);
    if (!multiple) setOpen(false);
    if (multiple) input.current?.focus();
    else toggle.current?.focus();
  };
  const addCustomValue = () => {
    const nextValue = customValue.trim();
    if (!nextValue) return;
    onChange(multiple ? selected.includes(nextValue) ? selected : [...selected, nextValue] : [nextValue]);
    setCustomValue(''); setQuery(''); setActive(0); setAddingCustom(false);
    if (!multiple) setOpen(false);
    if (multiple) input.current?.focus();
    else toggle.current?.focus();
  };
  return <div className={`searchable-select ${open && !disabled ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''}`}
    onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) { setOpen(false); setQuery(''); setAddingCustom(false); } }}>
      <div className="selection-control">
        <div className="selection-values">
          {selected.map((entry) => {
            const selectedLabel = options.find((option) => option.value === entry)?.label ?? entry;
            if (!multiple && !open && !disabled) return <button className="selection-single selection-single-trigger" type="button" key={entry} aria-label={`Alterar ${label}: ${selectedLabel}`} aria-haspopup="listbox" aria-expanded={false} onClick={openAndFocus}>{selectedLabel}</button>;
            if (!multiple && open) return null;
            return <span className={multiple ? 'selection-chip' : 'selection-single'} key={entry}>
              {selectedLabel}
              {multiple && !disabled && <button type="button" aria-label={`Remover ${selectedLabel}`} onClick={() => onChange(selected.filter((item) => item !== entry))}><X size={12} /></button>}
            </span>;
          })}
          {(multiple || !selected.length || open) && <input ref={input} role="combobox" aria-label={label} aria-expanded={open && !disabled} aria-controls={`${id}-list`} aria-autocomplete="list"
            aria-activedescendant={open && matches.length ? `${id}-option-${Math.min(active, matches.length - 1)}` : undefined}
            disabled={disabled} autoComplete="off" placeholder={selected.length && !multiple ? 'Pesquisar para substituir…' : selected.length ? 'Pesquisar…' : placeholder}
            value={query} onFocus={() => { setOpen(true); setActive(0); }} onClick={() => setOpen(true)}
            onChange={(event) => { setQuery(event.target.value); setActive(0); setOpen(true); }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); setActive((current) => availableOptions.length ? !open ? event.key === 'ArrowDown' ? 0 : availableOptions.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + availableOptions.length) % availableOptions.length : 0); }
              if (event.key === 'Enter') { event.preventDefault(); if (open && availableOptions.length) choose(availableOptions[Math.min(active, availableOptions.length - 1)]); else setOpen(true); }
              if (event.key === 'Escape') { event.preventDefault(); setOpen(false); setQuery(''); setAddingCustom(false); toggle.current?.focus(); }
            }} />}
        </div>
      {!!selected.length && !multiple && !disabled && <button className="selection-clear" type="button" aria-label={`Limpar ${label}`} onClick={() => { onChange([]); requestAnimationFrame(() => input.current?.focus()); }}><X size={14} /></button>}
      <button ref={toggle} type="button" className="selection-toggle" disabled={disabled} aria-label={`${open ? 'Fechar' : 'Abrir'} opções de ${label}`} aria-haspopup="listbox" aria-expanded={open && !disabled} onClick={() => { if (open) { setOpen(false); setQuery(''); setAddingCustom(false); } else openAndFocus(); }}><ChevronDown size={16} /></button>
    </div>
    {open && !disabled && <div className="selection-popup">
      {addingCustom ? <form className="selection-custom" onSubmit={(event) => { event.preventDefault(); addCustomValue(); }}>
        <label htmlFor={`${id}-custom`}>{customInputLabel ?? `Qual é o outro valor para ${label.toLocaleLowerCase()}?`}</label>
        <div><input ref={customInput} id={`${id}-custom`} maxLength={255} value={customValue} onChange={(event) => setCustomValue(event.target.value)} placeholder="Digite o valor" /><button type="submit" className="secondary-button">Adicionar</button></div>
        <button type="button" className="selection-custom-cancel" onClick={() => { setAddingCustom(false); requestAnimationFrame(() => input.current?.focus()); }}>Voltar para opções</button>
      </form> : <>
        <div className="selection-hint"><Search size={13} aria-hidden="true" /> {multiple ? 'Digite para pesquisar · Selecione um ou mais itens' : selected.length ? 'Pesquise e selecione outra opção para substituir a atual' : 'Digite para pesquisar'}</div>
        <div id={`${id}-list`} role="listbox" aria-label={`Opções de ${label}`} aria-multiselectable={multiple}>
          {availableOptions.map((option, index) => <button id={`${id}-option-${index}`} key={option.value} type="button" role="option" aria-selected={selected.includes(option.value)}
            className={`selection-option ${active === index ? 'is-active' : ''} ${option.value === customOptionValue ? 'selection-option-custom' : ''}`} onMouseDown={(event) => event.preventDefault()} onMouseEnter={() => setActive(index)} onClick={() => choose(option)}>
            <span><strong>{option.label}</strong>{option.description && <small>{option.description}</small>}</span>
            {selected.includes(option.value) && <Check size={16} aria-hidden="true" />}
          </button>)}
          {!matches.length && !allowCustom && <p className="selection-empty">Nenhuma opção encontrada.</p>}
        </div>
      </>}
    </div>}
  </div>;
}
