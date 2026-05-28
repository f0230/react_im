import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';
import sql from 'highlight.js/lib/languages/sql';
import xml from 'highlight.js/lib/languages/xml';
import 'highlight.js/styles/github.css';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('jsx', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('ts', typescript);
hljs.registerLanguage('tsx', typescript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('py', python);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('sh', bash);
hljs.registerLanguage('json', json);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('html', xml);

function CodeBlock({ className, children }) {
    const ref = useRef(null);
    const lang = (className || '').replace('language-', '');

    useEffect(() => {
        if (ref.current && !ref.current.dataset.highlighted) {
            hljs.highlightElement(ref.current);
        }
    }, [children]);

    return (
        <pre className="rounded-lg bg-neutral-950 p-3 overflow-x-auto my-2 text-[12px] font-mono leading-relaxed">
            <code ref={ref} className={lang ? `language-${lang}` : ''}>
                {String(children).replace(/\n$/, '')}
            </code>
        </pre>
    );
}

const components = {
    p: ({ children }) => (
        <p className="leading-relaxed mb-1 last:mb-0 break-words [overflow-wrap:anywhere]">{children}</p>
    ),
    strong: ({ children }) => (
        <strong className="font-semibold">{children}</strong>
    ),
    em: ({ children }) => <em className="italic">{children}</em>,
    a: ({ href, children }) => (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-indigo-600 hover:text-indigo-700 break-all"
        >
            {children}
        </a>
    ),
    code: ({ node, inline, className, children, ...props }) => {
        if (inline) {
            return (
                <code
                    className="rounded-md bg-neutral-200 px-1.5 py-0.5 font-mono text-[11px] text-neutral-800"
                    {...props}
                >
                    {children}
                </code>
            );
        }
        return <CodeBlock className={className}>{children}</CodeBlock>;
    },
    pre: ({ children }) => <>{children}</>,
    ul: ({ children }) => (
        <ul className="space-y-0.5 pl-1 my-1">{children}</ul>
    ),
    ol: ({ children }) => (
        <ol className="space-y-0.5 pl-1 my-1">{children}</ol>
    ),
    li: ({ children, index, ordered }) => (
        <li className="flex items-start gap-2 text-[13px]">
            {ordered
                ? <span className="text-[11px] font-semibold text-neutral-400 shrink-0 mt-0.5 min-w-[14px]">{(index ?? 0) + 1}.</span>
                : <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-neutral-400 shrink-0" />
            }
            <span className="flex-1 min-w-0">{children}</span>
        </li>
    ),
    h1: ({ children }) => (
        <h1 className="text-[15px] font-bold mt-2 mb-1 first:mt-0">{children}</h1>
    ),
    h2: ({ children }) => (
        <h2 className="text-sm font-bold mt-1.5 mb-0.5 first:mt-0">{children}</h2>
    ),
    h3: ({ children }) => (
        <h3 className="text-sm font-semibold mt-1 mb-0.5 first:mt-0">{children}</h3>
    ),
    hr: () => <hr className="border-neutral-200 my-2" />,
    blockquote: ({ children }) => (
        <blockquote className="border-l-2 border-neutral-300 pl-3 text-neutral-500 italic my-1">
            {children}
        </blockquote>
    ),
    table: ({ children }) => (
        <div className="overflow-x-auto my-2">
            <table className="text-[12px] border-collapse w-full">{children}</table>
        </div>
    ),
    th: ({ children }) => (
        <th className="border border-neutral-200 px-2 py-1 bg-neutral-100 font-semibold text-left">
            {children}
        </th>
    ),
    td: ({ children }) => (
        <td className="border border-neutral-200 px-2 py-1">{children}</td>
    ),
    input: ({ checked }) => (
        <input
            type="checkbox"
            checked={checked}
            readOnly
            className="mr-1.5 accent-neutral-800"
        />
    ),
};

export function MarkdownRenderer({ text, className = '' }) {
    return (
        <div className={`text-[13px] leading-relaxed text-neutral-800 space-y-0.5 ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={components}
            >
                {text || ''}
            </ReactMarkdown>
        </div>
    );
}

export default MarkdownRenderer;
