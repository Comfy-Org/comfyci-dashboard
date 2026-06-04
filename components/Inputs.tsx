import React from 'react'

/** Shared brand field styling for inputs & selects. */
export const fieldClass =
    'h-10 rounded-lg border border-smoke-300 bg-white px-3 text-sm text-charcoal-800 outline-none transition ' +
    'placeholder:text-ash-500 focus:border-electric/60 focus:ring-2 focus:ring-electric/30 ' +
    'dark:border-charcoal-400/60 dark:bg-charcoal-700 dark:text-smoke-100 dark:placeholder:text-smoke-800'

export const BrandSelect: React.FC<{
    id?: string
    value: string
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
    children: React.ReactNode
    className?: string
}> = ({ id, value, onChange, children, className = '' }) => (
    <div className="relative">
        <select
            id={id}
            value={value}
            onChange={onChange}
            className={`${fieldClass} w-full appearance-none pr-9 ${className}`}
        >
            {children}
        </select>
        <svg
            className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ash-500 dark:text-smoke-700"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden
        >
            <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
            />
        </svg>
    </div>
)
