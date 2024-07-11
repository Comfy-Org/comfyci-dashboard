import { Tooltip } from 'flowbite-react';
import { useRouter } from 'next/router';

interface OSStatusButtonProps {
    text: string;
    status: string;
    onClick?: () => void;
}

export const WorkflowStatusButton: React.FC<OSStatusButtonProps> = ({ text, status, onClick }) => {

    let statusText = '';
    let bgColor = '';

    switch (status) {
        case 'red':
            statusText = 'Failed';
            bgColor = 'bg-red-500';
            break;
        case 'orange':
            statusText = 'In Progress';
            bgColor = 'bg-orange-400';
            break;
        case 'green':
            statusText = 'Success';
            bgColor = 'bg-green-500';
            break;
        default:
            statusText = 'Unknown Status';
            bgColor = 'bg-gray-500';  // Default color
    }

    return (
        <Tooltip content={statusText} placement="top">
            <button className={`${bgColor} text-white py-2 px-4 rounded focus:outline-none focus:shadow-outline`} onClick={onClick}>
                {text}
            </button>
        </Tooltip>
    );
};
