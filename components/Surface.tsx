import React from 'react'

/**
 * Surface — the standard brand card container. Ink-tinted in dark mode,
 * white in light mode, with a hairline border and soft shadow.
 */
export const Surface: React.FC<
    React.PropsWithChildren<{ className?: string }>
> = ({ children, className = '' }) => (
    <div
        className={[
            'rounded-2xl border border-smoke-300 dark:border-charcoal-400/60',
            'bg-white dark:bg-ink-800/70 shadow-card',
            className,
        ].join(' ')}
    >
        {children}
    </div>
)

export const SectionTitle: React.FC<
    React.PropsWithChildren<{ className?: string }>
> = ({ children, className = '' }) => (
    <h2
        className={[
            'text-xs font-semibold uppercase tracking-[0.18em] text-ash-500 dark:text-smoke-800',
            className,
        ].join(' ')}
    >
        {children}
    </h2>
)
