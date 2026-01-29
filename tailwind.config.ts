import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Netflix-inspired color palette
        'netflix-red': '#E50914',
        'netflix-red-hover': '#F40612',
        'netflix-black': '#141414',
        'netflix-dark': '#181818',
        'netflix-gray': '#2F2F2F',
        'netflix-light-gray': '#B3B3B3',
      },
    },
  },
  plugins: [],
};

export default config;
