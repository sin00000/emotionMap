import { defineConfig } from 'vite';

export default defineConfig({
    base: '/emotionMap/', // GitHub Pages base path
    server: {
        host: true,
        port: 5173,
        open: true,
        strictPort: true
    }
});
