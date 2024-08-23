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
                <Link
                    href="/waterfall"
                    className="text-blue-500 hover:text-blue-700 underline hover:no-underline">
                    
                        Waterfall
                    
                </Link>
                <Link
                    href="/"
                    className="text-blue-500 hover:text-blue-700 underline hover:no-underline">
                    
                        All Results
                    
                </Link>
            </div>
        </div>
    );
};
