import Link from "next/link"
import ThemeToggler from "./ThemeToggler"

export const Header = () => {
    return (
        <div style={{ padding: 20 }}>
            <h1 className="text-center text-3xl text-gray-700 dark:text-gray-200 mb-4">
                <ThemeToggler />
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
            </div>
        </div>
    );
};
