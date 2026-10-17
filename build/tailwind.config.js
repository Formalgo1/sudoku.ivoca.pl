// Konfiguracja Tailwinda przeniesiona z HTML (dawniej cdn.tailwindcss.com). Kompilacja: zob. build/README.md
module.exports = { content: ['./index.html'], ...{
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        brand: {
                            50: '#f0f7ff',
                            100: '#e0effe',
                            500: '#3b82f6',
                            600: '#2563eb',
                            700: '#1d4ed8',
                        }
                    }
                }
            }
        } };
