import { defineConfig } from 'vitest/config';

// Basic Vitest configuration for this project
export default defineConfig({
    test: {
        // Run tests in a Node-like environment by default
        environment: 'node',
        // Allow using describe/it/expect without importing from 'vitest'
        globals: true,
        // Look for test files under tests/ with .test.ts extension
        include: ['tests/**/*.test.ts']
    }
});
