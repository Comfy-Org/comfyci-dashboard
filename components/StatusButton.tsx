import { Tooltip } from 'flowbite-react';

interface OSStatusButtonProps {
    text: string;
    status: string;
    onClick?: () => void;
}

const STATUS_STYLES: Record<string, { label: string; classes: string; dot: string }> = {
    red: {
        label: 'Failed',
        classes: 'bg-red-500/15 text-red-400 ring-1 ring-inset ring-red-500/30 hover:bg-red-500/25',
        dot: 'bg-red-500',
    },
    orange: {
        label: 'In Progress',
        classes: 'bg-amber-400/15 text-amber-300 ring-1 ring-inset ring-amber-400/30 hover:bg-amber-400/25',
        dot: 'bg-amber-400 animate-pulse',
    },
    green: {
        label: 'Success',
        classes: 'bg-emerald-500/15 text-emerald-400 ring-1 ring-inset ring-emerald-500/30 hover:bg-emerald-500/25',
        dot: 'bg-emerald-500',
    },
    default: {
        label: 'Unknown Status',
        classes: 'bg-charcoal-300/40 text-smoke-700 ring-1 ring-inset ring-charcoal-300/50 hover:bg-charcoal-300/60',
        dot: 'bg-smoke-700',
    },
};

export const WorkflowStatusButton: React.FC<OSStatusButtonProps> = ({ text, status, onClick }) => {
    const style = STATUS_STYLES[status] || STATUS_STYLES.default;

    return (
        <Tooltip content={style.label} placement="top">
            <button
                type="button"
                onClick={onClick}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${style.classes} ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
            >
                <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                {text}
            </button>
        </Tooltip>
    );
};
