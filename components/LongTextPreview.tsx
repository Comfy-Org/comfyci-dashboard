import React, { useState } from 'react';

const LongTextPreview = ({ text, previewLines = 1 }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const lines = text.split('\n');
    const preview = lines.slice(0, previewLines).join('\n');

    return (
        <div className="border rounded-md p-2 bg-gray-50">
            <pre className="whitespace-pre-wrap break-words">
                {isExpanded ? text : preview}
                {lines.length > previewLines && !isExpanded && '...'}
            </pre>
            {lines.length > previewLines && (
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="mt-2 text-blue-600 hover:text-blue-800 underline"
                >
                    {isExpanded ? 'Show Less' : 'Show More'}
                </button>
            )}
        </div>
    );
};

export default LongTextPreview;
