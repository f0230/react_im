import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, BookOpen, Calendar, Check, ChevronDown, ChevronLeft, ChevronRight, Code2, FileText, Link2, Loader2, Plus, Quote, RefreshCw } from 'lucide-react';
import { createNotionTask, fetchNotionPage, fetchNotionSubPage, toggleNotionTodo, updateNotionStatus } from '@/services/notionService';
import { createShortLink } from '@/services/shortLinkService';

const NO_STATUS_LABEL = 'Sin estado';

function initialsOf(name) {
    return String(name || '')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() || '')
        .join('');
}

// Edición (escritura a Notion) disponible para admins. Se provee por contexto
// para no pasar callbacks por todos los niveles del árbol de bloques.
const NotionEditContext = createContext({ canEdit: false, toggleTodo: null, updateStatus: null });

const SUPPORTED_TEXT_BLOCKS = new Set([
    'paragraph',
    'heading_1',
    'heading_2',
    'heading_3',
    'bulleted_list_item',
    'numbered_list_item',
    'quote',
    'callout',
    'table_of_contents',
]);

const NOTION_BADGE_COLORS = {
    red: 'bg-red-100 text-red-700',
    orange: 'bg-orange-100 text-orange-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    green: 'bg-emerald-100 text-emerald-700',
    blue: 'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
    pink: 'bg-pink-100 text-pink-700',
    brown: 'bg-amber-100 text-amber-800',
    gray: 'bg-neutral-100 text-neutral-600',
    default: 'bg-neutral-100 text-neutral-600',
};

const BOARD_COLUMN_STYLES = {
    red: 'border-red-100 bg-red-50/70',
    orange: 'border-orange-100 bg-orange-50/70',
    yellow: 'border-yellow-100 bg-yellow-50/70',
    green: 'border-emerald-100 bg-emerald-50/70',
    blue: 'border-blue-100 bg-blue-50/70',
    purple: 'border-purple-100 bg-purple-50/70',
    pink: 'border-pink-100 bg-pink-50/70',
    brown: 'border-amber-100 bg-amber-50/70',
    gray: 'border-neutral-200 bg-neutral-100/70',
    default: 'border-neutral-200 bg-neutral-50',
};

const STATUS_ORDER = [
    'not started',
    'to do',
    'todo',
    'pendiente',
    'in progress',
    'en progreso',
    'doing',
    'done',
    'complete',
    'completed',
    'completado',
    'blocked',
    'bloqueado',
];

function safeText(value) {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) {
        return value.map((v) => (typeof v === 'string' ? v : v?.plain_text || '')).join('');
    }
    if (typeof value === 'object') {
        return value.plain_text || value.name || value.content || '';
    }
    return String(value);
}

function normalizeLabel(value) {
    return safeText(value).trim().toLowerCase();
}

function badgeColor(color) {
    return NOTION_BADGE_COLORS[color] || NOTION_BADGE_COLORS.default;
}

function columnStyle(color) {
    return BOARD_COLUMN_STYLES[color] || BOARD_COLUMN_STYLES.default;
}

// Notion inline text/background colors → tailwind classes
const NOTION_TEXT_COLORS = {
    gray: 'text-neutral-400',
    brown: 'text-amber-700',
    orange: 'text-orange-600',
    yellow: 'text-yellow-600',
    green: 'text-emerald-600',
    blue: 'text-blue-600',
    purple: 'text-purple-600',
    pink: 'text-pink-600',
    red: 'text-red-600',
    gray_background: 'bg-neutral-100 rounded px-1',
    brown_background: 'bg-amber-100 rounded px-1',
    orange_background: 'bg-orange-100 rounded px-1',
    yellow_background: 'bg-yellow-100 rounded px-1',
    green_background: 'bg-emerald-100 rounded px-1',
    blue_background: 'bg-blue-100 rounded px-1',
    purple_background: 'bg-purple-100 rounded px-1',
    pink_background: 'bg-pink-100 rounded px-1',
    red_background: 'bg-red-100 rounded px-1',
};

/* ─── Inline rich text: respeta negrita, itálica, links, código, color ─── */
function RichText({ segments, fallback = '' }) {
    if (!Array.isArray(segments) || segments.length === 0) {
        return fallback ? <>{fallback}</> : null;
    }

    return (
        <>
            {segments.map((seg, idx) => {
                const text = safeText(seg?.text ?? seg);
                if (!text) return null;

                const classes = [];
                if (seg?.bold) classes.push('font-semibold text-neutral-900');
                if (seg?.italic) classes.push('italic');
                if (seg?.strikethrough) classes.push('line-through');
                if (seg?.underline) classes.push('underline');
                if (seg?.color && seg.color !== 'default' && NOTION_TEXT_COLORS[seg.color]) {
                    classes.push(NOTION_TEXT_COLORS[seg.color]);
                }
                const className = classes.join(' ') || undefined;

                if (seg?.code) {
                    return (
                        <code key={idx} className={`rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[0.85em] text-pink-600 ${className || ''}`}>
                            {text}
                        </code>
                    );
                }

                if (seg?.href) {
                    return (
                        <a
                            key={idx}
                            href={seg.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`text-blue-600 underline decoration-blue-300 underline-offset-2 hover:text-blue-700 ${className || ''}`}
                        >
                            {text}
                        </a>
                    );
                }

                if (className) {
                    return <span key={idx} className={className}>{text}</span>;
                }
                return <React.Fragment key={idx}>{text}</React.Fragment>;
            })}
        </>
    );
}

/* ─── Checkbox editable (to-do) ────────────────────────────────────── */
function EditableTodo({ block }) {
    const { canEdit, toggleTodo } = useContext(NotionEditContext);
    const [checked, setChecked] = useState(Boolean(block.checked));
    const [saving, setSaving] = useState(false);
    const text = safeText(block.text);

    const handleToggle = async () => {
        if (!canEdit || saving) return;
        const next = !checked;
        setChecked(next);
        setSaving(true);
        try {
            await toggleTodo(block.id, next);
        } catch {
            setChecked(!next); // revertir si falla
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex items-start gap-3 text-[15px] leading-[1.7] text-neutral-700">
            <input
                type="checkbox"
                checked={checked}
                disabled={!canEdit || saving}
                onChange={handleToggle}
                className={`mt-1.5 h-4 w-4 shrink-0 rounded border-neutral-300 text-emerald-500 ${canEdit ? 'cursor-pointer' : ''}`}
            />
            <span className={checked ? 'text-neutral-400 line-through' : ''}>
                <RichText segments={block.richText} fallback={text || 'Tarea sin texto'} />
            </span>
        </div>
    );
}

/* ─── Estado editable (status/select de una fila) ──────────────────── */
function EditableStatus({ row, propName, prop, schemaEntry }) {
    const { canEdit, updateStatus } = useContext(NotionEditContext);
    const [saving, setSaving] = useState(false);
    const value = prop?.value || '';

    if (!canEdit || !schemaEntry?.options?.length) {
        return <PropertyPill prop={prop} />;
    }

    const handleChange = async (event) => {
        const next = event.target.value;
        if (next === value) return;
        setSaving(true);
        try {
            await updateStatus({
                pageId: row.id,
                property: propName,
                propertyType: schemaEntry.type,
                value: next || null,
            });
        } finally {
            setSaving(false);
        }
    };

    const hasUnlisted = value && !schemaEntry.options.some((o) => o.name === value);

    return (
        <span className="inline-flex items-center gap-1.5">
            <span className={`h-2 w-2 shrink-0 rounded-full ${badgeColor(prop?.color).split(' ')[0]}`} />
            <select
                value={value}
                disabled={saving}
                onChange={handleChange}
                className="max-w-[160px] rounded-full border border-neutral-200 bg-white px-2 py-1 text-xs font-medium text-neutral-700 outline-none transition hover:border-neutral-300 focus:border-neutral-400 disabled:opacity-50"
            >
                <option value="">—</option>
                {hasUnlisted && <option value={value}>{value}</option>}
                {schemaEntry.options.map((o) => (
                    <option key={o.name} value={o.name}>{o.name}</option>
                ))}
            </select>
        </span>
    );
}

function findStatusEntry(row) {
    const entries = Object.entries(row?.properties || {});
    return entries.find(([name, prop]) => {
        const normalizedName = normalizeLabel(name);
        return prop?.type === 'badge' && ['status', 'estado', 'state'].includes(normalizedName);
    }) || entries.find(([, prop]) => {
        if (prop?.type !== 'badge') return false;
        return STATUS_ORDER.includes(normalizeLabel(prop.value));
    });
}

function compareStatusLabels(a, b) {
    const aIndex = STATUS_ORDER.indexOf(normalizeLabel(a));
    const bIndex = STATUS_ORDER.indexOf(normalizeLabel(b));
    if (aIndex !== -1 || bIndex !== -1) {
        return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    }
    return safeText(a).localeCompare(safeText(b), 'es');
}

function PropertyPill({ prop }) {
    if (!prop || prop.value == null || prop.value === '') return null;

    if (prop.type === 'badge') {
        return (
            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${badgeColor(prop.color)}`}>
                {prop.value}
            </span>
        );
    }

    if (prop.type === 'badges' && Array.isArray(prop.value)) {
        return prop.value.map((badge, idx) => (
            <span
                key={`${badge.name}-${idx}`}
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${badgeColor(badge.color)}`}
            >
                {badge.name}
            </span>
        ));
    }

    if (prop.type === 'date' && prop.value) {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-600">
                <Calendar size={11} className="text-neutral-400" />
                {new Date(prop.value).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
            </span>
        );
    }

    if (prop.type === 'people' && Array.isArray(prop.value) && prop.value.length > 0) {
        return (
            <span className="inline-flex items-center gap-1.5">
                <span className="flex -space-x-1.5">
                    {prop.value.slice(0, 3).map((name, idx) => (
                        <span
                            key={`${name}-${idx}`}
                            title={name}
                            className="flex h-5 w-5 items-center justify-center rounded-full border border-white bg-neutral-200 text-[9px] font-bold text-neutral-600"
                        >
                            {initialsOf(name)}
                        </span>
                    ))}
                </span>
                {prop.value.length === 1 && (
                    <span className="text-xs text-neutral-500">{prop.value[0]}</span>
                )}
            </span>
        );
    }

    if (prop.type === 'checkbox') {
        return <span className="inline-flex text-xs text-neutral-500">{prop.value ? '✓' : '○'}</span>;
    }

    if (prop.type === 'text' || prop.type === 'email' || prop.type === 'phone' || prop.type === 'url' || prop.type === 'number') {
        return (
            <span className="inline-flex rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-600">
                {safeText(prop.value)}
            </span>
        );
    }

    return null;
}

function isEmptyProperty(prop) {
    if (!prop) return true;
    if (Array.isArray(prop.value)) return prop.value.length === 0;
    return prop.value == null || prop.value === '';
}

function collectDatabaseColumns(rows) {
    const titleLabel = rows.find((row) => row.titlePropertyName)?.titlePropertyName || 'Nombre';
    const columns = [{ key: '__title', label: titleLabel, type: 'title' }];
    const seen = new Set(['__title']);

    rows.forEach((row) => {
        Object.keys(row.properties || {}).forEach((name) => {
            if (!seen.has(name)) {
                seen.add(name);
                columns.push({ key: name, label: name, type: row.properties[name]?.type });
            }
        });
    });

    return columns;
}

function isLongTextColumn(label) {
    const normalized = normalizeLabel(label);
    return ['resumen', 'summary', 'notas', 'notes', 'descripcion', 'descripción'].some((part) => normalized.includes(part));
}

function DatabaseTableValue({ prop }) {
    if (isEmptyProperty(prop)) return <span className="text-neutral-300">-</span>;

    if (prop.type === 'badge' || prop.type === 'badges' || prop.type === 'date' || prop.type === 'people' || prop.type === 'checkbox') {
        return <div className="flex flex-wrap gap-1.5"><PropertyPill prop={prop} /></div>;
    }

    if (prop.type === 'url') {
        return (
            <a
                href={prop.value}
                target="_blank"
                rel="noopener noreferrer"
                className="break-words text-sm font-medium text-blue-600 hover:text-blue-700"
            >
                {prop.value}
            </a>
        );
    }

    return (
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-neutral-700">
            {safeText(prop.value)}
        </p>
    );
}

function BlockText({ block }) {
    const text = safeText(block.text);
    const title = safeText(block.title);
    if (!text && !title) return null;
    block = { ...block, text, title };

    const body = <RichText segments={block.richText} fallback={block.text} />;

    if (block.type === 'heading_1') {
        return <h2 className="mt-8 text-[1.7rem] font-bold leading-tight tracking-tight text-neutral-900 first:mt-0">{body}</h2>;
    }
    if (block.type === 'heading_2') {
        return <h3 className="mt-7 text-[1.35rem] font-bold leading-snug tracking-tight text-neutral-800 first:mt-0">{body}</h3>;
    }
    if (block.type === 'heading_3') {
        return <h4 className="mt-5 text-[1.1rem] font-bold leading-snug tracking-tight text-neutral-800 first:mt-0">{body}</h4>;
    }
    if (block.type === 'bulleted_list_item') {
        return (
            <div className="flex gap-3 text-[15px] leading-[1.7] text-neutral-700">
                <span className="mt-[0.65em] h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-400" />
                <p>{body}</p>
            </div>
        );
    }
    if (block.type === 'numbered_list_item') {
        return <p className="pl-5 text-[15px] leading-[1.7] text-neutral-700">{body}</p>;
    }
    if (block.type === 'quote') {
        return (
            <div className="flex gap-3 border-l-[3px] border-neutral-800 pl-4 text-[15px] leading-[1.7] text-neutral-700">
                <Quote size={15} className="mt-1 shrink-0 text-neutral-300" />
                <p>{body}</p>
            </div>
        );
    }
    if (block.type === 'callout') {
        const icon = safeText(block.icon);
        return (
            <div className="flex gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-[15px] leading-[1.7] text-neutral-700">
                {icon && <span className="shrink-0 text-lg leading-none">{icon}</span>}
                <p>{body}</p>
            </div>
        );
    }
    if (block.type === 'table_of_contents') {
        return (
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Tabla de contenidos</p>
                <p className="mt-2 text-sm text-neutral-600">Generada automáticamente por Notion</p>
            </div>
        );
    }

    return <p className="text-[15px] leading-[1.7] text-neutral-700">{body}</p>;
}

function DatabaseRowCard({ row, onClick, statusName, statusMeta }) {
    // Meta visible: prioridad, tipo, asignado, fecha… Se ocultan el estado
    // (ya implícito en la columna) y los textos largos tipo "Summary".
    const metaEntries = Object.entries(row.properties || {}).filter(([name, prop]) => {
        if (name === statusName) return false;
        if (isEmptyProperty(prop)) return false;
        if (prop.type === 'text' && isLongTextColumn(name)) return false;
        return true;
    });

    return (
        <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:border-neutral-300">
            <button
                type="button"
                onClick={() => onClick(row)}
                className="block w-full break-words text-left text-sm font-semibold leading-snug text-neutral-900 transition hover:text-neutral-600"
            >
                {row.title || 'Fila sin título'}
            </button>
            {metaEntries.length > 0 && (
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    {metaEntries.map(([propName, prop]) => (
                        <PropertyPill key={propName} prop={prop} />
                    ))}
                </div>
            )}
            {statusMeta?.options && (
                <div className="mt-3 border-t border-neutral-100 pt-2.5">
                    <EditableStatus
                        row={row}
                        propName={statusName}
                        prop={row.properties?.[statusName]}
                        schemaEntry={statusMeta}
                    />
                </div>
            )}
        </div>
    );
}

/* ─── Columna del kanban (con alta de tareas) ──────────────────────── */
function BoardColumn({ column, statusMeta, onChildPageClick }) {
    const { canEdit, createTask } = useContext(NotionEditContext);
    const [adding, setAdding] = useState(false);
    const [text, setText] = useState('');
    const [saving, setSaving] = useState(false);

    const canAdd = canEdit && typeof createTask === 'function' && statusMeta && column.name !== NO_STATUS_LABEL;

    const submit = async () => {
        const title = text.trim();
        if (!title) { setAdding(false); return; }
        setSaving(true);
        try {
            await createTask({ title, status: column.name, statusProperty: statusMeta.name, statusType: statusMeta.type });
            setText('');
            setAdding(false);
        } catch {
            /* dejamos el input para reintentar */
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className={`flex max-h-[72vh] w-[320px] shrink-0 flex-col rounded-2xl border ${columnStyle(column.color)}`}>
            <div className="flex items-center gap-2 px-3 pb-2 pt-3">
                <span className={`h-2.5 w-2.5 rounded-full ${badgeColor(column.color).split(' ')[0]}`} />
                <h4 className="text-sm font-bold text-neutral-800">{column.name}</h4>
                <span className="text-xs font-semibold text-neutral-400">{column.rows.length}</span>
            </div>

            <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-3 pb-3">
                {column.rows.map((row) => (
                    <DatabaseRowCard
                        key={row.id}
                        row={row}
                        statusName={statusMeta?.name}
                        statusMeta={statusMeta}
                        onClick={onChildPageClick}
                    />
                ))}

                {canAdd && (adding ? (
                    <div className="rounded-xl border border-neutral-300 bg-white p-2.5 shadow-sm">
                        <textarea
                            autoFocus
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
                                if (e.key === 'Escape') { setAdding(false); setText(''); }
                            }}
                            placeholder="Nombre de la tarea…"
                            rows={2}
                            className="w-full resize-none break-words text-sm text-neutral-800 outline-none placeholder:text-neutral-400"
                        />
                        <div className="mt-1.5 flex items-center gap-2">
                            <button
                                type="button"
                                onClick={submit}
                                disabled={saving}
                                className="inline-flex items-center gap-1 rounded-md bg-neutral-900 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-neutral-700 disabled:opacity-50"
                            >
                                {saving ? <Loader2 size={12} className="animate-spin" /> : null}
                                {saving ? 'Agregando…' : 'Agregar'}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setAdding(false); setText(''); }}
                                className="text-xs text-neutral-400 transition hover:text-neutral-600"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => setAdding(true)}
                        className="flex items-center gap-1.5 rounded-xl px-2 py-2 text-xs font-medium text-neutral-400 transition hover:bg-white hover:text-neutral-700"
                    >
                        <Plus size={14} /> Agregar tarea
                    </button>
                ))}
            </div>
        </section>
    );
}

function NotionDatabaseBoard({ rows, onChildPageClick, schema }) {
    const statusMeta = useMemo(() => {
        if (schema) {
            const names = Object.keys(schema);
            const name = names.find((n) => ['status', 'estado', 'state'].includes(normalizeLabel(n)))
                || names.find((n) => schema[n].type === 'status')
                || null;
            if (name) return { name, type: schema[name].type, options: schema[name].options };
        }
        const entry = rows.map(findStatusEntry).find(Boolean);
        return entry ? { name: entry[0], type: entry[1].notionType || 'status', options: null } : null;
    }, [schema, rows]);

    const statusName = statusMeta?.name;

    const columns = useMemo(() => {
        const buckets = new Map();
        const colorByName = {};
        rows.forEach((row) => {
            const value = statusName ? (row.properties?.[statusName]?.value || null) : null;
            const key = value || NO_STATUS_LABEL;
            if (!buckets.has(key)) buckets.set(key, []);
            buckets.get(key).push(row);
            if (value) colorByName[value] = row.properties?.[statusName]?.color || 'default';
        });

        const out = [];
        (statusMeta?.options || []).forEach((opt) => {
            out.push({ name: opt.name, color: opt.color, rows: buckets.get(opt.name) || [] });
            buckets.delete(opt.name);
        });
        for (const [name, rws] of buckets) {
            out.push({ name, color: name === NO_STATUS_LABEL ? 'gray' : (colorByName[name] || 'default'), rows: rws });
        }
        return out;
    }, [rows, statusMeta, statusName]);

    return (
        <div className="flex items-start gap-4 overflow-x-auto pb-4">
            {columns.map((column) => (
                <BoardColumn
                    key={column.name}
                    column={column}
                    statusMeta={statusMeta}
                    onChildPageClick={onChildPageClick}
                />
            ))}
        </div>
    );
}

function NotionDatabaseTable({ rows, onChildPageClick, schema }) {
    const columns = collectDatabaseColumns(rows);

    return (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-left text-sm">
                    <thead>
                        <tr className="border-b border-neutral-200 bg-neutral-50">
                            {columns.map((column) => (
                                <th
                                    key={column.key}
                                    className={[
                                        'px-4 py-3 text-xs font-bold uppercase tracking-wide text-neutral-500',
                                        column.key === '__title' ? 'min-w-[220px]' : '',
                                        isLongTextColumn(column.label) ? 'min-w-[420px]' : 'min-w-[180px]',
                                    ].join(' ')}
                                >
                                    {column.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={row.id} className="border-b border-neutral-100 last:border-b-0">
                                {columns.map((column) => {
                                    if (column.key === '__title') {
                                        return (
                                            <td key={column.key} className="min-w-[220px] px-4 py-4 align-top">
                                                <button
                                                    type="button"
                                                    onClick={() => onChildPageClick(row)}
                                                    className="group flex w-full items-start justify-between gap-3 text-left"
                                                >
                                                    <span className="font-semibold leading-snug text-neutral-900 group-hover:text-neutral-700">
                                                        {row.title || 'Fila sin título'}
                                                    </span>
                                                    <ChevronRight size={15} className="mt-0.5 shrink-0 text-neutral-300 group-hover:text-neutral-500" />
                                                </button>
                                            </td>
                                        );
                                    }

                                    return (
                                        <td
                                            key={column.key}
                                            className={[
                                                'border-l border-neutral-100 px-4 py-4 align-top',
                                                isLongTextColumn(column.label) ? 'min-w-[420px] max-w-[520px]' : 'min-w-[180px] max-w-[280px]',
                                            ].join(' ')}
                                        >
                                            {schema?.[column.key] ? (
                                                <EditableStatus
                                                    row={row}
                                                    propName={column.key}
                                                    prop={row.properties?.[column.key]}
                                                    schemaEntry={schema[column.key]}
                                                />
                                            ) : (
                                                <DatabaseTableValue prop={row.properties?.[column.key]} />
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function NotionTable({ block }) {
    const rows = Array.isArray(block.rows) ? block.rows : [];
    const width = block.tableWidth || Math.max(0, ...rows.map((row) => row.cells?.length || 0));

    if (!rows.length || !width) {
        return (
            <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                <p className="text-sm text-neutral-500">Tabla de Notion sin filas visibles.</p>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-left text-sm">
                    <tbody>
                        {rows.map((row, rowIndex) => (
                            <tr key={row.id || rowIndex} className="border-b border-neutral-100 last:border-b-0">
                                {Array.from({ length: width }).map((_, cellIndex) => {
                                    const isColumnHeader = block.hasColumnHeader && rowIndex === 0;
                                    const isRowHeader = block.hasRowHeader && cellIndex === 0;
                                    const CellTag = isColumnHeader || isRowHeader ? 'th' : 'td';

                                    return (
                                        <CellTag
                                            key={`${row.id || rowIndex}-${cellIndex}`}
                                            scope={isColumnHeader ? 'col' : isRowHeader ? 'row' : undefined}
                                            className={[
                                                'min-w-[160px] border-r border-neutral-100 px-4 py-3 align-top last:border-r-0',
                                                isColumnHeader || isRowHeader
                                                    ? 'bg-neutral-50 font-semibold text-neutral-900'
                                                    : 'text-neutral-700',
                                            ].join(' ')}
                                        >
                                            {safeText(row.cells?.[cellIndex]) || <span className="text-neutral-300">-</span>}
                                        </CellTag>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// Tipos que ya renderizan sus propios hijos (no se les agrega el bloque genérico).
const HANDLES_OWN_CHILDREN = new Set(['toggle', 'synced_block', 'column_list', 'transcription']);

// Las notas de reunión de IA de Notion vienen como 3 sub-secciones en orden fijo.
const TRANSCRIPTION_TAB_LABELS = ['Resumen', 'Notas', 'Transcripción'];

/* ─── Bloque de notas de reunión (IA) con pestañas ─────────────────── */
function TranscriptionBlock({ block, onChildPageClick }) {
    const children = Array.isArray(block.children) ? block.children : [];
    const [active, setActive] = useState(0);
    const current = children[active] || children[0];

    return (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-4 md:p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-neutral-800">
                <FileText size={15} className="shrink-0 text-neutral-400" />
                <RichText segments={block.richText} fallback={safeText(block.title) || 'Notas de la reunión'} />
            </div>

            {children.length === 0 ? null : children.length === 1 ? (
                <div className="mt-4 space-y-3">
                    <BlockRenderer block={children[0]} onChildPageClick={onChildPageClick} />
                </div>
            ) : (
                <>
                    <div className="mt-4 flex flex-wrap gap-1 border-b border-neutral-200">
                        {children.map((child, i) => (
                            <button
                                key={child.id}
                                type="button"
                                onClick={() => setActive(i)}
                                className={`-mb-px rounded-t-lg px-3 py-2 text-xs font-semibold transition ${
                                    i === active
                                        ? 'border-b-2 border-neutral-800 text-neutral-900'
                                        : 'text-neutral-400 hover:text-neutral-700'
                                }`}
                            >
                                {TRANSCRIPTION_TAB_LABELS[i] || `Sección ${i + 1}`}
                            </button>
                        ))}
                    </div>
                    <div className="mt-4 space-y-3">
                        <BlockRenderer block={current} onChildPageClick={onChildPageClick} />
                    </div>
                </>
            )}
        </div>
    );
}

function BlockSelf({ block, onChildPageClick }) {
    block = {
        ...block,
        text: safeText(block.text),
        title: safeText(block.title),
        caption: safeText(block.caption),
    };
    if (SUPPORTED_TEXT_BLOCKS.has(block.type)) {
        return <BlockText block={block} />;
    }

    // Notas de reunión de IA de Notion: el contenido vive en los hijos → pestañas.
    if (block.type === 'transcription') {
        return <TranscriptionBlock block={block} onChildPageClick={onChildPageClick} />;
    }

    if (block.type === 'toggle') {
        const children = Array.isArray(block.children) ? block.children : [];
        return (
            <details className="rounded-xl border border-neutral-200 bg-white px-4 py-3">
                <summary className="cursor-pointer font-semibold text-neutral-800 hover:text-neutral-900">
                    <RichText segments={block.richText} fallback={safeText(block.title) || 'Expandir'} />
                </summary>
                {(children.length > 0 || block.text) && (
                    <div className="mt-3 space-y-3 text-[15px] leading-[1.7] text-neutral-700">
                        {children.length > 0
                            ? children.map((child) => (
                                <BlockRenderer key={child.id} block={child} onChildPageClick={onChildPageClick} />
                            ))
                            : <p>{safeText(block.text)}</p>}
                    </div>
                )}
            </details>
        );
    }

    if (block.type === 'to_do') {
        return <EditableTodo block={block} />;
    }

    if (block.type === 'child_page' || block.type === 'child_database') {
        return (
            <button
                type="button"
                onClick={() => onChildPageClick(block)}
                className="w-full text-left flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 transition hover:bg-neutral-50 hover:border-neutral-300"
            >
                <BookOpen size={16} className="shrink-0 text-neutral-400" />
                <div className="flex-1">
                    <p className="text-sm font-semibold text-neutral-800">{block.title || 'Página sin título'}</p>
                    <p className="text-xs text-neutral-400">
                        {block.type === 'child_database' ? 'Base de datos de Notion' : 'Haz clic para explorar'}
                    </p>
                </div>
                <ChevronRight size={16} className="shrink-0 text-neutral-400" />
            </button>
        );
    }

    if (block.type === 'code') {
        return (
            <div className="rounded-2xl border border-neutral-200 bg-neutral-950 p-4 text-neutral-100">
                <div className="mb-3 flex items-center gap-2 text-xs text-neutral-400">
                    <Code2 size={14} />
                    {block.language || 'code'}
                </div>
                <pre className="overflow-x-auto whitespace-pre-wrap text-xs leading-relaxed">{block.text}</pre>
            </div>
        );
    }

    if (block.type === 'image' && block.url) {
        return (
            <figure className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
                <img src={block.url} alt={block.caption || 'Imagen de Notion'} className="max-h-[420px] w-full object-contain" />
                {block.caption && <figcaption className="px-4 py-3 text-xs text-neutral-400">{block.caption}</figcaption>}
            </figure>
        );
    }

    if ((block.type === 'file' || block.type === 'pdf' || block.type === 'bookmark' || block.type === 'embed') && block.url) {
        return (
            <a
                href={block.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
            >
                <FileText size={16} className="shrink-0 text-neutral-400" />
                {block.caption || block.text || block.url}
            </a>
        );
    }

    if (block.type === 'divider') {
        return <div className="my-5 h-px bg-neutral-200" />;
    }

    if (block.type === 'database_info') {
        return (
            <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                    <BookOpen size={20} className="mt-0.5 shrink-0 text-blue-600" />
                    <div className="flex-1">
                        <p className="font-semibold text-blue-900">{block.title || 'Base de datos de Notion'}</p>
                        <p className="mt-2 text-sm leading-relaxed text-blue-800">{block.text}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (block.type === 'database_row') {
        const properties = block.properties || {};
        const propEntries = Object.entries(properties).slice(0, 4);

        return (
            <button
                type="button"
                onClick={() => onChildPageClick(block)}
                className="w-full text-left rounded-2xl border border-neutral-200 bg-white p-4 transition hover:bg-neutral-50 hover:border-neutral-300"
            >
                <div className="flex items-center justify-between gap-3 mb-3">
                    <p className="text-sm font-semibold text-neutral-900">{block.title || 'Fila sin título'}</p>
                    <ChevronRight size={16} className="shrink-0 text-neutral-400" />
                </div>
                {propEntries.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {propEntries.map(([propName, prop]) => {
                            if (!prop || !prop.value) return null;

                            if (prop.type === 'badge' && prop.value) {
                                return (
                                    <span
                                        key={propName}
                                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${badgeColor(prop.color)}`}
                                    >
                                        {prop.value}
                                    </span>
                                );
                            }

                            if (prop.type === 'badges' && Array.isArray(prop.value)) {
                                return (
                                    <div key={propName} className="flex flex-wrap gap-1.5">
                                        {prop.value.map((badge, idx) => {
                                            return (
                                                <span
                                                    key={idx}
                                                    className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${badgeColor(badge.color)}`}
                                                >
                                                    {badge.name}
                                                </span>
                                            );
                                        })}
                                    </div>
                                );
                            }

                            if (prop.type === 'date' && prop.value) {
                                return (
                                    <span key={propName} className="text-xs bg-neutral-100 text-neutral-600 px-2.5 py-1 rounded-full">
                                        {new Date(prop.value).toLocaleDateString('es-ES', {
                                            month: 'short',
                                            day: 'numeric',
                                        })}
                                    </span>
                                );
                            }

                            if (prop.type === 'people' && Array.isArray(prop.value)) {
                                return (
                                    <span key={propName} className="text-xs bg-neutral-100 text-neutral-600 px-2.5 py-1 rounded-full">
                                        {prop.value.join(', ')}
                                    </span>
                                );
                            }

                            if (prop.type === 'checkbox') {
                                return (
                                    <span key={propName} className="text-xs">
                                        {prop.value ? '✓' : '○'}
                                    </span>
                                );
                            }

                            return null;
                        })}
                    </div>
                )}
            </button>
        );
    }

    if (block.type === 'video' && block.url) {
        return (
            <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
                <video controls className="w-full max-h-[400px]">
                    <source src={block.url} />
                    Tu navegador no soporta videos.
                </video>
                {block.caption && <p className="px-4 py-3 text-xs text-neutral-400">{block.caption}</p>}
            </div>
        );
    }

    if (block.type === 'audio' && block.url) {
        return (
            <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                <audio controls className="w-full">
                    <source src={block.url} />
                    Tu navegador no soporta audio.
                </audio>
                {block.caption && <p className="mt-2 text-xs text-neutral-400">{block.caption}</p>}
            </div>
        );
    }

    if (block.type === 'table') {
        return <NotionTable block={block} />;
    }

    if (block.type === 'column_list') {
        const columns = Array.isArray(block.columns) ? block.columns : [];
        if (columns.length === 0) return null;
        return (
            <div className="flex flex-col gap-4 md:flex-row md:gap-6">
                {columns.map((column) => (
                    <div key={column.id} className="min-w-0 flex-1 space-y-3">
                        {(column.blocks || []).map((child) => (
                            <BlockRenderer key={child.id} block={child} onChildPageClick={onChildPageClick} />
                        ))}
                    </div>
                ))}
            </div>
        );
    }

    if (block.type === 'synced_block') {
        const children = Array.isArray(block.children) ? block.children : [];
        if (children.length > 0) {
            return (
                <div className="space-y-3">
                    {children.map((child) => (
                        <BlockRenderer key={child.id} block={child} onChildPageClick={onChildPageClick} />
                    ))}
                </div>
            );
        }
        return block.text ? <p className="text-[15px] leading-[1.7] text-neutral-700">{block.text}</p> : null;
    }

    if (block.type === 'unsupported') {
        return null;
    }

    if (block.text || block.title) {
        return (
            <div className="text-[15px] leading-[1.7] text-neutral-700">
                {block.title && <p className="font-semibold text-neutral-800">{block.title}</p>}
                {block.text && <p>{block.text}</p>}
            </div>
        );
    }

    return null;
}

// Renderiza un bloque y, de forma genérica, su contenido anidado (hijos).
function BlockRenderer({ block, onChildPageClick }) {
    const children = Array.isArray(block.children) ? block.children : [];

    // Sin hijos, o bloques que ya manejan sus propios hijos → render directo.
    if (children.length === 0 || HANDLES_OWN_CHILDREN.has(block.type)) {
        return <BlockSelf block={block} onChildPageClick={onChildPageClick} />;
    }

    const childList = children.map((child) => (
        <BlockRenderer key={child.id} block={child} onChildPageClick={onChildPageClick} />
    ));

    // Párrafo vacío que solo agrupa contenido (patrón común en notas de Notion):
    // pasamos los hijos al mismo nivel, sin indentar.
    const isEmptyWrapper = block.type === 'paragraph' && !safeText(block.text);
    if (isEmptyWrapper) {
        return <div className="space-y-3">{childList}</div>;
    }

    return (
        <div>
            <BlockSelf block={block} onChildPageClick={onChildPageClick} />
            <div className="mt-3 space-y-3 border-l-2 border-neutral-100 pl-4">
                {childList}
            </div>
        </div>
    );
}

const NotionPageView = ({ projectId, pageId = null, basePath, projectTitle, onBackToProjects, onClose, canEdit = false }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const [page, setPage] = useState(null);
    const [blocks, setBlocks] = useState([]);
    const [propertySchema, setPropertySchema] = useState(null);
    const [titleProperty, setTitleProperty] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);
    const [nextCursor, setNextCursor] = useState(null);
    const [hasMore, setHasMore] = useState(false);
    const [copied, setCopied] = useState(false);

    // El breadcrumb viaja en el state de la URL: así un deep-link directo sigue
    // funcionando (se reconstruye con la página actual) y la navegación interna
    // conserva la ruta completa de ancestros.
    const trail = useMemo(() => location.state?.notionTrail || [], [location.state]);

    const load = useCallback(async (cursor = null) => {
        const data = pageId
            ? await fetchNotionSubPage(projectId, pageId, cursor)
            : await fetchNotionPage(projectId, cursor);
        setPage(data.page);
        setBlocks((prev) => (cursor ? [...prev, ...data.blocks] : data.blocks));
        setPropertySchema(data.propertySchema || null);
        setTitleProperty(data.titleProperty || null);
        setNextCursor(data.nextCursor);
        setHasMore(data.hasMore);
        setError(null);
    }, [projectId, pageId]);

    // ── Edición (admin) ──────────────────────────────────────────────
    const handleToggleTodo = useCallback((blockId, checked) => (
        toggleNotionTodo(projectId, blockId, checked)
    ), [projectId]);

    const handleUpdateStatus = useCallback(async ({ pageId: rowId, property, propertyType, value }) => {
        // Update optimista en el árbol de bloques → el board reagrupa solo.
        let previous;
        setBlocks((prev) => prev.map((b) => {
            if (b.id !== rowId) return b;
            previous = b.properties?.[property]?.value ?? null;
            return {
                ...b,
                properties: {
                    ...b.properties,
                    [property]: { ...(b.properties?.[property] || { type: 'badge', notionType: propertyType }), value },
                },
            };
        }));
        try {
            await updateNotionStatus(projectId, { pageId: rowId, property, propertyType, value });
        } catch (err) {
            setBlocks((prev) => prev.map((b) => (
                b.id === rowId
                    ? { ...b, properties: { ...b.properties, [property]: { ...b.properties[property], value: previous } } }
                    : b
            )));
            throw err;
        }
    }, [projectId]);

    const databaseId = page?.id || null;
    const handleCreateTask = useCallback(async ({ title, status, statusProperty, statusType }) => {
        if (!databaseId || !titleProperty) {
            throw new Error('No se puede crear la tarea: falta la base o la propiedad de título.');
        }
        const data = await createNotionTask(projectId, {
            databaseId,
            title,
            titleProperty,
            status,
            statusProperty,
            statusType,
        });
        if (data?.row) setBlocks((prev) => [...prev, data.row]);
        return data?.row;
    }, [projectId, databaseId, titleProperty]);

    const editContextValue = useMemo(() => ({
        canEdit,
        toggleTodo: handleToggleTodo,
        updateStatus: handleUpdateStatus,
        createTask: (canEdit && databaseId && titleProperty) ? handleCreateTask : null,
    }), [canEdit, databaseId, titleProperty, handleToggleTodo, handleUpdateStatus, handleCreateTask]);

    useEffect(() => {
        setLoading(true);
        setBlocks([]);
        setNextCursor(null);
        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'auto' });
        load(null)
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [load]);

    const goToPage = useCallback((id, nextTrail) => {
        navigate(id ? `${basePath}/${id}` : basePath, { state: { notionTrail: nextTrail } });
    }, [navigate, basePath]);

    const handleRefresh = async () => {
        setLoading(true);
        setBlocks([]);
        setNextCursor(null);
        try {
            await load(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLoadMore = async () => {
        if (!nextCursor || loadingMore) return;
        setLoadingMore(true);
        try {
            await load(nextCursor);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoadingMore(false);
        }
    };

    const handleChildPageClick = useCallback((block) => {
        const currentTrail = trail.length > 0
            ? trail
            : (pageId ? [{ id: pageId, title: page?.title || 'Página' }] : []);
        const nextTrail = [...currentTrail, { id: block.id, title: block.title || 'Página' }];
        goToPage(block.id, nextTrail);
    }, [trail, pageId, page?.title, goToPage]);

    const handleCopyLink = useCallback(async () => {
        try {
            let toCopy = window.location.href;
            try {
                // Generar un link corto /s/:code para ocultar el ID largo de la página de Notion.
                const code = await createShortLink(window.location.pathname, projectId);
                toCopy = `${window.location.origin}/s/${code}`;
            } catch {
                /* fallback: si falla la generación, copiamos la URL completa */
            }
            await navigator.clipboard.writeText(toCopy);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            /* clipboard no disponible — sin acción */
        }
    }, [projectId]);

    // root + cadena de ancestros (último = página actual, no clickeable)
    const breadcrumbItems = useMemo(() => {
        const root = { id: null, title: projectTitle || 'Inicio' };
        if (!pageId) return [root];
        if (trail.length > 0) return [root, ...trail];
        return [root, { id: pageId, title: page?.title || 'Página' }];
    }, [pageId, trail, page?.title, projectTitle]);

    const handleBreadcrumbClick = useCallback((idx) => {
        if (idx === 0) {
            goToPage(null, []);
            return;
        }
        const slicedTrail = breadcrumbItems.slice(1, idx + 1);
        goToPage(breadcrumbItems[idx].id, slicedTrail);
    }, [breadcrumbItems, goToPage]);

    const handleBack = useCallback(() => {
        if (trail.length >= 2) {
            goToPage(trail[trail.length - 2].id, trail.slice(0, -1));
        } else {
            goToPage(null, []);
        }
    }, [trail, goToPage]);

    const databaseRows = useMemo(() => blocks.filter((block) => block.type === 'database_row'), [blocks]);
    const shouldRenderKanban = databaseRows.length > 0
        && databaseRows.length === blocks.length
        && databaseRows.some((row) => findStatusEntry(row));
    const shouldRenderDatabaseTable = databaseRows.length > 0 && databaseRows.length === blocks.length;
    const isDatabaseView = shouldRenderKanban || shouldRenderDatabaseTable;

    return (
      <NotionEditContext.Provider value={editContextValue}>
        <div className="font-product">
            {/* Barra superior compacta: volver + breadcrumb + acciones */}
            <div className="mb-7 flex items-center gap-3 border-b border-neutral-200 pb-3">
                {onBackToProjects && (
                    <button
                        type="button"
                        onClick={onBackToProjects}
                        className="-ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
                        title="Volver a proyectos"
                    >
                        <ArrowLeft size={16} />
                    </button>
                )}
                <nav className="flex min-w-0 flex-1 items-center gap-1.5 text-[13px] text-neutral-500">
                    {breadcrumbItems.map((item, idx) => {
                        const isLast = idx === breadcrumbItems.length - 1;
                        return (
                            <React.Fragment key={item.id || 'root'}>
                                {idx > 0 && <ChevronRight size={14} className="shrink-0 text-neutral-300" />}
                                {isLast ? (
                                    <span className="truncate font-semibold text-neutral-900">{item.title}</span>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => handleBreadcrumbClick(idx)}
                                        className="shrink-0 truncate transition hover:text-neutral-900"
                                    >
                                        {item.title}
                                    </button>
                                )}
                            </React.Fragment>
                        );
                    })}
                </nav>

                <div className="flex shrink-0 items-center gap-0.5 text-neutral-400">
                    {pageId && (
                        <button
                            type="button"
                            onClick={handleBack}
                            className="flex h-7 w-7 items-center justify-center rounded-full transition hover:bg-neutral-100 hover:text-neutral-700"
                            title="Subir un nivel"
                        >
                            <ChevronLeft size={16} />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={handleCopyLink}
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium transition hover:bg-neutral-100 hover:text-neutral-700"
                        title="Copiar el link de esta página para compartir"
                    >
                        {copied ? <Check size={14} className="text-emerald-500" /> : <Link2 size={14} />}
                        <span className="hidden sm:inline">{copied ? 'Copiado' : 'Copiar link'}</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={loading}
                        className="flex h-7 w-7 items-center justify-center rounded-full transition hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-40"
                        title="Actualizar"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-full px-2.5 py-1.5 text-xs font-medium transition hover:bg-neutral-100 hover:text-neutral-700"
                        >
                            Cerrar
                        </button>
                    )}
                </div>
            </div>

            {/* Contenido principal */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 size={24} className="animate-spin text-neutral-400" />
                </div>
            ) : error ? (
                <div className="mx-auto flex max-w-[760px] items-center gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
                    <AlertCircle size={16} className="shrink-0" />
                    {error}
                </div>
            ) : isDatabaseView ? (
                <div className="space-y-6">
                    <h1 className="text-3xl font-bold tracking-tight text-neutral-900 md:text-4xl">
                        {page?.title || 'Notion'}
                    </h1>
                    {shouldRenderKanban ? (
                        <NotionDatabaseBoard rows={databaseRows} onChildPageClick={handleChildPageClick} schema={propertySchema} />
                    ) : (
                        <NotionDatabaseTable rows={databaseRows} onChildPageClick={handleChildPageClick} schema={propertySchema} />
                    )}
                </div>
            ) : (
                <article className="mx-auto max-w-[760px]">
                    <h1 className="mb-8 text-3xl font-bold leading-tight tracking-tight text-neutral-900 md:text-4xl">
                        {page?.title || 'Notion'}
                    </h1>
                    {blocks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <BookOpen size={32} className="mb-3 text-neutral-200" />
                            <p className="text-sm text-neutral-400">Esta página no tiene contenido visible para la integración.</p>
                        </div>
                    ) : (
                        <div className="space-y-3.5">
                            {blocks.map((block) => (
                                <BlockRenderer
                                    key={block.id}
                                    block={block}
                                    onChildPageClick={handleChildPageClick}
                                />
                            ))}
                        </div>
                    )}
                </article>
            )}

            {/* Botón para cargar más */}
            {hasMore && !loading && (
                <div className="mt-8 flex justify-center">
                    <button
                        type="button"
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                        className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50 disabled:opacity-50"
                    >
                        {loadingMore ? <Loader2 size={13} className="animate-spin" /> : <ChevronDown size={13} />}
                        {loadingMore ? 'Cargando...' : 'Cargar más'}
                    </button>
                </div>
            )}
        </div>
      </NotionEditContext.Provider>
    );
};

export default NotionPageView;
