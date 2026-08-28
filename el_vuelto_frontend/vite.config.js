var _a, _b;
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';
export default defineConfig({
    publicDir: 'assets',
    plugins: [tailwindcss(), react()],
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
        },
    },
    server: {
        // Listen on every interface. Vite's default is localhost-only, which is
        // invisible from outside the container — nginx would answer 502 for every
        // page load. Equivalent to the --host flag in the Dockerfile's CMD.
        host: true,
        port: 5173,
        // Fail loudly instead of silently drifting to 5174: the whole setup relies
        // on this port number being the same inside Docker, outside, and in nginx.
        strictPort: true,
        hmr: {
            // The browser talks to the HMR WebSocket through nginx, not to Vite
            // directly, so the client has to dial the PUBLISHED port. It happens to
            // be 5173 as well, but the two are different things and only one of them
            // is what the browser can reach.
            clientPort: Number((_a = process.env.VITE_HMR_CLIENT_PORT) !== null && _a !== void 0 ? _a : 5173),
        },
        // Bind-mounted files on Docker Desktop for Mac frequently emit no inotify
        // events. Without polling, saving a .tsx changes nothing in the browser and
        // the failure is completely silent.
        watch: {
            usePolling: true,
            interval: 300,
        },
        // Newer Vite rejects a proxied request whose Host header it does not
        // recognise ("Blocked request. This host is not allowed"). The Mac's LAN IP
        // is not knowable ahead of time, and the request arrives via nginx anyway.
        allowedHosts: true,
        // Only used when running `npm run dev` on the host, WITHOUT Docker: it
        // gives that setup the same same-origin /api path the container stack gets
        // from nginx. Inside Docker nginx intercepts /api long before Vite sees it.
        proxy: {
            '/api': {
                target: (_b = process.env.VITE_PROXY_TARGET) !== null && _b !== void 0 ? _b : 'http://127.0.0.1:8000',
                changeOrigin: true,
            },
        },
    },
});
