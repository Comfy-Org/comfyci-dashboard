import React, { useState } from 'react';

const LongTextPreview = ({ text, previewLines = 1 }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const lines = text.split('\n');
    const preview = lines.slice(0, previewLines).join('\n');

    return (
        <div className="rounded-lg border border-smoke-300 dark:border-charcoal-400/60 bg-smoke-100 dark:bg-charcoal-800 p-3">
            <pre className="whitespace-pre-wrap break-words font-mono text-xs text-charcoal-800 dark:text-smoke-300">
                {isExpanded ? text : preview}
                {lines.length > previewLines && !isExpanded && '...'}
            </pre>
            {lines.length > previewLines && (
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="mt-2 text-sm font-semibold text-sapphire-700 dark:text-electric hover:underline"
                >
                    {isExpanded ? 'Show Less' : 'Show More'}
                </button>
            )}
        </div>
    );
};

export default LongTextPreview;
