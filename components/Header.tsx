import Link from "next/link"

export const Header = () => {
    return (
        <div style={{ padding: 20 }}>
            <h1 className="text-center text-3xl text-gray-700 mb-4">
                Comfy Workflows CI/CD
            </h1>
            <div className="flex justify-center gap-4">
                <Link href="/waterfall">
                    <a className="text-blue-500 hover:text-blue-700 underline hover:no-underline">
                        Waterfall
                    </a>
                </Link>
                <Link href="/">
                    <a className="text-blue-500 hover:text-blue-700 underline hover:no-underline">
                        All Results
                    </a>
                </Link>
                <Link href="/commit">
                    <a className="text-blue-500 hover:text-blue-700 underline hover:no-underline">
                        Specific Workflow
                    </a>
                </Link>
            </div>
        </div>
    );
};