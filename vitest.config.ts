import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

// Vitest configuration with SvelteKit plugin so aliases like $lib resolve in tests
export default defineConfig({
    plugins: [sveltekit()],
    test: {
        // Run tests in a Node-like environment by default
        environment: 'node',
        // Allow using describe/it/expect without importing from 'vitest'
        globals: true,
        // Look for test files under tests/ with .test.ts extension
        include: ['tests/**/*.test.ts']
    }
});
