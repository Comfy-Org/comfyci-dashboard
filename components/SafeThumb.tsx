import Image from 'next/image'
import React from 'react'

/** Dashed "no output" box shown wherever a legacy thumbnail is missing or fails to load. */
export const NoOutput: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div
        className={`flex items-center justify-center rounded-lg border border-dashed border-smoke-400 dark:border-charcoal-400/60 text-[10px] text-ash-500 dark:text-smoke-800 ${className}`}
    >
        no output
    </div>
)

/**
 * Thumbnail that swaps to <NoOutput> when the image fails to load. The legacy GCS
 * thumbnail bucket has been emptied, so most api.comfy.org storage URLs now 404.
 */
export const SafeThumb: React.FC<{
    src: string
    alt: string
    /** Intrinsic size hint for next/image; the rendered size comes from className. */
    size: number
    className?: string
}> = ({ src, alt, size, className = '' }) => {
    const [failedSrc, setFailedSrc] = React.useState<string | null>(null)
    if (failedSrc === src) return <NoOutput className={className} />
    return (
        <Image
            src={src}
            alt={alt}
            width={size}
            height={size}
            onError={() => setFailedSrc(src)}
            className={`rounded-lg border border-smoke-300 dark:border-charcoal-400/60 object-cover ${className}`}
        />
    )
}
