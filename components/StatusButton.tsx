import { Tooltip } from 'flowbite-react';
import { useRouter } from 'next/router';

interface OSStatusButtonProps {
    os: string;
    status: string;
    commitId: string
    repo: string
    branch: string
}

export const OSStatusButton: React.FC<OSStatusButtonProps> = ({ os, status, commitId, repo, branch }) => {
    const router = useRouter();
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

    const handleClick = () => {
        const query = {
            os,
            commitId,
            repo,
            branch,
        };
        // Update the URL with new query parameters
        router.push({ pathname: '/', query });
    };

    return (
        <Tooltip content={statusText} placement="top">
            <button className={`${bgColor} text-white py-2 px-4 rounded focus:outline-none focus:shadow-outline`} onClick={handleClick}>
                {os}
            </button>
        </Tooltip>
    );
};
