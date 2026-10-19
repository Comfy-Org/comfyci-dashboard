import React from 'react'
import { Surface, SectionTitle } from '../Surface'

/** Placeholder while a section's head file is loading. */
export const SectionSkeleton: React.FC<{ title: string; rows?: number }> = ({ title, rows = 3 }) => (
    <Surface className="mb-6 p-5">
        <SectionTitle>{title}</SectionTitle>
        <div role="status" aria-label={`Loading ${title}`} className="mt-3 animate-pulse space-y-2">
            {Array.from({ length: rows }, (_, i) => (
                <div
                    key={i}
                    className="h-4 rounded bg-smoke-200 dark:bg-charcoal-400/40"
                    style={{ width: `${88 - i * 14}%` }}
                />
            ))}
        </div>
    </Surface>
)

/** The section's head file is not published: the publisher has not run yet. */
export const SectionMissing: React.FC<{ title: string; file: string; children?: React.ReactNode }> = ({
    title,
    file,
    children,
}) => (
    <Surface className="mb-6 p-5">
        <SectionTitle>{title}</SectionTitle>
        <p className="mt-2 text-sm text-ash-500 dark:text-smoke-800">
            Publisher has not run yet: <span className="font-mono">{file}</span> is not published.
            {children}
        </p>
    </Surface>
)

/** Title row of a section: the uppercase title left, a short caption right. */
export const SectionHead: React.FC<{ title: string; caption?: React.ReactNode; children?: React.ReactNode }> = ({
    title,
    caption,
    children,
}) => (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
        <SectionTitle>{title}</SectionTitle>
        {caption && <span className="text-[11px] text-ash-500 dark:text-smoke-800">{caption}</span>}
        {children}
    </div>
)
