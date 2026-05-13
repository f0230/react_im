import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, BookOpen, ChevronDown, ChevronRight, Code2, FileText, Loader2, Quote, RefreshCw } from 'lucide-react';
import { fetchNotionPage, fetchNotionSubPage } from '@/services/notionService';

const SUPPORTED_TEXT_BLOCKS = new Set([
    'paragraph',
    'heading_1',
    'heading_2',
    'heading_3',
    'bulleted_list_item',
    'numbered_list_item',
    'quote',
    'callout',
    'toggle',
    'table_of_contents',
    'synced_block',
    'column',
    'video',
    'audio',
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
            <span className="inline-flex rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-600">
                {new Date(prop.value).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
            </span>
        );
    }

    if (prop.type === 'people' && Array.isArray(prop.value) && prop.value.length > 0) {
        return (
            <span className="inline-flex rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-600">
                {prop.value.join(', ')}
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

    if (block.type === 'heading_1') {
        return <h2 className="mt-5 text-2xl font-bold tracking-tight text-neutral-900 first:mt-0">{block.text}</h2>;
    }
    if (block.type === 'heading_2') {
        return <h3 className="mt-4 text-xl font-bold tracking-tight text-neutral-800 first:mt-0">{block.text}</h3>;
    }
    if (block.type === 'heading_3') {
        return <h4 className="mt-3 text-base font-bold tracking-tight text-neutral-800 first:mt-0">{block.text}</h4>;
    }
    if (block.type === 'bulleted_list_item') {
        return (
            <div className="flex gap-3 text-sm leading-relaxed text-neutral-600">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-300" />
                <p>{block.text}</p>
            </div>
        );
    }
    if (block.type === 'numbered_list_item') {
        return <p className="pl-5 text-sm leading-relaxed text-neutral-600">{block.text}</p>;
    }
    if (block.type === 'quote') {
        return (
            <div className="flex gap-3 rounded-2xl border-l-4 border-neutral-300 bg-white px-4 py-3 text-sm leading-relaxed text-neutral-600">
                <Quote size={15} className="mt-0.5 shrink-0 text-neutral-300" />
                <p>{block.text}</p>
            </div>
        );
    }
    if (block.type === 'callout') {
        return (
            <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm leading-relaxed text-neutral-600">
                {block.text}
            </div>
        );
    }
    if (block.type === 'toggle') {
        return (
            <details className="rounded-2xl border border-neutral-200 bg-white px-4 py-3">
                <summary className="cursor-pointer font-semibold text-neutral-800 hover:text-neutral-900">
                    {block.title || 'Expandir'}
                </summary>
                {block.text && <p className="mt-3 text-sm leading-relaxed text-neutral-600">{block.text}</p>}
            </details>
        );
    }
    if (block.type === 'table_of_contents') {
        return (
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Tabla de contenidos</p>
                <p className="mt-2 text-sm text-neutral-600">Generada automáticamente por Notion</p>
            </div>
        );
    }

    return <p className="text-sm leading-relaxed text-neutral-600">{block.text}</p>;
}

function DatabaseRowCard({ row, onClick, hiddenPropertyName }) {
    const propEntries = Object.entries(row.properties || {})
        .filter(([name]) => name !== hiddenPropertyName)
        .slice(0, 5);

    return (
        <button
            type="button"
            onClick={() => onClick(row)}
            className="w-full rounded-2xl border border-neutral-200 bg-white p-4 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:border-neutral-300 hover:bg-neutral-50"
        >
            <p className="text-sm font-semibold leading-snug text-neutral-900">{row.title || 'Fila sin título'}</p>
            {propEntries.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                    {propEntries.map(([propName, prop]) => (
                        <PropertyPill key={propName} prop={prop} />
                    ))}
                </div>
            )}
        </button>
    );
}

function NotionDatabaseBoard({ rows, onChildPageClick }) {
    const groups = rows.reduce((acc, row) => {
        const statusEntry = findStatusEntry(row);
        const statusName = statusEntry?.[1]?.value || 'Sin estado';
        const color = statusEntry?.[1]?.color || 'default';
        const hiddenPropertyName = statusEntry?.[0] || null;

        if (!acc.has(statusName)) {
            acc.set(statusName, { name: statusName, color, hiddenPropertyName, rows: [] });
        }
        acc.get(statusName).rows.push(row);
        return acc;
    }, new Map());

    const columns = Array.from(groups.values()).sort((a, b) => compareStatusLabels(a.name, b.name));

    return (
        <div className="flex gap-4 overflow-x-auto pb-2">
            {columns.map((column) => (
                <section
                    key={column.name}
                    className={`flex min-h-[220px] w-[300px] shrink-0 flex-col rounded-2xl border p-3 ${columnStyle(column.color)}`}
                >
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${badgeColor(column.color).split(' ')[0]}`} />
                            <h4 className="text-sm font-bold text-neutral-800">{column.name}</h4>
                        </div>
                        <span className="text-xs font-semibold text-neutral-400">{column.rows.length}</span>
                    </div>
                    <div className="flex flex-1 flex-col gap-2.5">
                        {column.rows.map((row) => (
                            <DatabaseRowCard
                                key={row.id}
                                row={row}
                                hiddenPropertyName={column.hiddenPropertyName}
                                onClick={onChildPageClick}
                            />
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}

function NotionDatabaseTable({ rows, onChildPageClick }) {
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
                                            <DatabaseTableValue prop={row.properties?.[column.key]} />
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

function BlockRenderer({ block, onChildPageClick }) {
    block = {
        ...block,
        text: safeText(block.text),
        title: safeText(block.title),
        caption: safeText(block.caption),
    };
    if (SUPPORTED_TEXT_BLOCKS.has(block.type)) {
        return <BlockText block={block} />;
    }

    if (block.type === 'to_do') {
        return (
            <div className="flex items-start gap-3 text-sm leading-relaxed text-neutral-600">
                <input
                    type="checkbox"
                    checked={block.checked}
                    disabled
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-neutral-300 text-emerald-500"
                />
                <span className={block.checked ? 'text-neutral-400 line-through' : ''}>{block.text || 'Tarea sin texto'}</span>
            </div>
        );
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
        return (
            <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                <p className="text-sm text-neutral-600">Columnas de Notion (contenido no renderizado)</p>
            </div>
        );
    }

    if (block.type === 'synced_block') {
        return (
            <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                <p className="text-sm text-neutral-600">Bloque sincronizado de Notion</p>
                {block.text && <p className="mt-2 text-sm text-neutral-700">{block.text}</p>}
            </div>
        );
    }

    if (block.type === 'column') {
        return (
            <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                {block.text && <p className="text-sm text-neutral-700">{block.text}</p>}
            </div>
        );
    }

    if (block.type === 'unsupported') {
        return null;
    }

    if (block.text || block.title) {
        return (
            <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm text-neutral-600">
                <p className="text-xs font-mono text-neutral-400 mb-1">Tipo: {block.type}</p>
                {block.title && <p className="font-semibold text-neutral-800">{block.title}</p>}
                {block.text && <p className="text-neutral-700">{block.text}</p>}
            </div>
        );
    }

    return null;
}

const NotionPageView = ({ projectId, onClose }) => {
    const [page, setPage] = useState(null);
    const [blocks, setBlocks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);
    const [nextCursor, setNextCursor] = useState(null);
    const [hasMore, setHasMore] = useState(false);
    const [navStack, setNavStack] = useState([]);

    const load = useCallback(async (cursor = null) => {
        if (navStack.length === 0) {
            const data = await fetchNotionPage(projectId, cursor);
            setPage(data.page);
            setBlocks((prev) => (cursor ? [...prev, ...data.blocks] : data.blocks));
            setNextCursor(data.nextCursor);
            setHasMore(data.hasMore);
        } else {
            const currentPageId = navStack.at(-1).id;
            const data = await fetchNotionSubPage(projectId, currentPageId, cursor);
            setPage(data.page);
            setBlocks((prev) => (cursor ? [...prev, ...data.blocks] : data.blocks));
            setNextCursor(data.nextCursor);
            setHasMore(data.hasMore);
        }
        setError(null);
    }, [projectId, navStack]);

    useEffect(() => {
        setLoading(true);
        setBlocks([]);
        setNextCursor(null);
        load(null)
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [load]);

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
        setBlocks([]);
        setError(null);
        setNavStack((prev) => [...prev, { id: block.id, title: block.title }]);
    }, []);

    const handleGoBack = useCallback(() => {
        setNavStack((prev) => prev.slice(0, -1));
    }, []);

    const breadcrumbItems = useMemo(() => {
        return [
            { title: 'Servicios', id: null },
            ...navStack,
        ];
    }, [navStack]);

    const databaseRows = useMemo(() => blocks.filter((block) => block.type === 'database_row'), [blocks]);
    const shouldRenderKanban = databaseRows.length > 0
        && databaseRows.length === blocks.length
        && databaseRows.some((row) => findStatusEntry(row));
    const shouldRenderDatabaseTable = databaseRows.length > 0 && databaseRows.length === blocks.length;

    return (
        <div className="rounded-[28px] border border-neutral-200 bg-[#fafafa] p-6 md:p-8">
            {/* Header con título y controles */}
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-neutral-900">
                        <BookOpen size={18} className="text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold tracking-tight text-neutral-900">{page?.title || 'Notion'}</h3>
                        <p className="text-xs text-neutral-400">Desde Notion</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={loading}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-400 transition hover:border-neutral-300 hover:text-neutral-700 disabled:opacity-40"
                        title="Actualizar"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-500 transition hover:bg-neutral-100"
                        >
                            Cerrar
                        </button>
                    )}
                </div>
            </div>

            {/* Breadcrumb de navegación */}
            {navStack.length > 0 && (
                <div className="mb-6 flex items-center gap-2 text-sm">
                    {breadcrumbItems.map((item, idx) => (
                        <React.Fragment key={item.id || 'root'}>
                            {idx > 0 && <ChevronRight size={14} className="text-neutral-300" />}
                            {item.id ? (
                                <button
                                    type="button"
                                    onClick={() => setNavStack((prev) => prev.slice(0, idx))}
                                    className="text-neutral-600 transition hover:text-neutral-900"
                                >
                                    {item.title}
                                </button>
                            ) : (
                                <span className="text-neutral-900 font-medium">{item.title}</span>
                            )}
                        </React.Fragment>
                    ))}
                </div>
            )}

            {/* Contenido principal */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 size={24} className="animate-spin text-neutral-400" />
                </div>
            ) : error ? (
                <div className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
                    <AlertCircle size={16} className="shrink-0" />
                    {error}
                </div>
            ) : blocks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <BookOpen size={32} className="mb-3 text-neutral-200" />
                    <p className="text-sm text-neutral-400">Esta página no tiene contenido visible para la integración.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {shouldRenderKanban ? (
                        <NotionDatabaseBoard rows={databaseRows} onChildPageClick={handleChildPageClick} />
                    ) : shouldRenderDatabaseTable ? (
                        <NotionDatabaseTable rows={databaseRows} onChildPageClick={handleChildPageClick} />
                    ) : (
                        blocks.map((block) => (
                            <BlockRenderer
                                key={block.id}
                                block={block}
                                onChildPageClick={handleChildPageClick}
                            />
                        ))
                    )}
                </div>
            )}

            {/* Botón para cargar más */}
            {hasMore && !loading && (
                <div className="mt-5 flex justify-center">
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
    );
};

export default NotionPageView;
