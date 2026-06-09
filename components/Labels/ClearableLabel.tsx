import React from 'react'
import { MdClear } from 'react-icons/md'
import { fieldClass } from '../Inputs'

export const ClearableLabel: React.FC<{
    id: string
    label: string
    value: string
    disabled?: boolean
    onClear: () => void
    onChange: (value: string) => void
}> = ({ label, value, onClear, onChange, id, disabled = false }) => {
    return (
        <div className="relative flex items-center">
            <input
                id={id}
                type="text"
                placeholder={label}
                aria-label={label}
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value)}
                className={`${fieldClass} w-56 ${value ? 'pr-9' : ''} disabled:cursor-not-allowed disabled:opacity-50`}
            />
            {value && !disabled && (
                <button
                    onClick={onClear}
                    type="button"
                    aria-label="Clear"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-ash-500 hover:bg-smoke-200 hover:text-charcoal-800 dark:hover:bg-charcoal-400/60 dark:hover:text-smoke-100"
                >
                    <MdClear size="15px" />
                </button>
            )}
        </div>
    )
}
