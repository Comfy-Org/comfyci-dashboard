/** @type {import('tailwindcss').Config} */

module.exports = {
    darkMode: 'class',
    content: [
        './pages/**/*.{js,ts,jsx,tsx}',
        './components/**/*.{js,ts,jsx,tsx}',
        'node_modules/flowbite-react/lib/esm/**/*.js',
    ],
    theme: {
        extend: {
            colors: {
                // ── Comfy brand palette (from ComfyUI_frontend design-system) ──
                // Ink: deep aubergine-near-black backgrounds
                ink: {
                    100: '#5c5362',
                    200: '#4f4754',
                    300: '#413b45',
                    400: '#353139',
                    500: '#312c34',
                    600: '#29252c',
                    700: '#232025',
                    800: '#19161a',
                    900: '#151317',
                },
                // Charcoal: neutral dark surfaces
                charcoal: {
                    100: '#55565e',
                    200: '#494a50',
                    300: '#3c3d42',
                    400: '#313235',
                    500: '#2d2e32',
                    600: '#262729',
                    700: '#202121',
                    800: '#171718',
                },
                // Smoke / ash: light text + muted greys
                smoke: {
                    100: '#f3f3f3',
                    200: '#e9e9e9',
                    300: '#e1e1e1',
                    400: '#d9d9d9',
                    500: '#c5c5c5',
                    600: '#b4b4b4',
                    700: '#a0a0a0',
                    800: '#8a8a8a',
                },
                ash: {
                    300: '#bbbbbb',
                    500: '#828282',
                    800: '#444444',
                },
                // Plum: secondary purple accent
                plum: {
                    300: '#afa3db',
                    400: '#8d7fc5',
                    500: '#6b5ca8',
                    600: '#49378b',
                },
                // Brand accents
                electric: {
                    DEFAULT: '#f0ff41',
                    400: '#f0ff41',
                },
                sapphire: {
                    DEFAULT: '#172dd7',
                    700: '#172dd7',
                },

                // ── Legacy comfy colors (kept for back-compat) ──
                'button-rose': '#E6BCB5',
                'button-grass': '#E4E3AC',
                'button-sky': '#B8C8CB',
                'background-tint': '#FAF7F2',
                'comfy-bg': '#202020',
                'secondary-dirt': '#EDDCC0',
                'secondary-pink': '#FFD3B8',
                'secondary-grey': '#D9D9D9',
                'black-regular': '#000000',
                'primary-regular': '#D78190',
                'primary-dark': '#C76D7E',
                black: '#000000',
                'grey-regular': '#2D353F',
                'bright-charcoal': '#A4C4D2'
            },
            boxShadow: {
                'card': '0 1px 2px 0 rgba(0,0,0,0.3), 0 1px 6px -1px rgba(0,0,0,0.2)',
                'glow': '0 0 0 1px rgba(240,255,65,0.25), 0 4px 20px -4px rgba(240,255,65,0.15)',
            },
        },
        fontFamily: {
            sans: ['"PP Formula"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
            title: ['"PP Formula"', 'Inter', 'sans-serif'],
        },
        fontWeight: {
            'extra-light': 100,
            thin: 200,
            light: 300,
            normal: 400,
            medium: 500,
            semibold: 600,
            bold: 700,
            'extra-bold': 800,
            black: 900,
        },
        screens: {
            xs: '320px',
            sm: '640px',
            md: '768px',
            lg: '1024px',
            xl: '1280px',
            '2xl': '1536px',
        },
    },
    plugins: [require('flowbite/plugin')],
}
