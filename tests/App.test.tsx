import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../src/App';

describe('App', () => {
    beforeEach(() => {
        // Mock fetch globally for testing
        global.fetch = vi.fn((url) => {
            if (url === '/api/auth/me') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ authenticated: false })
                });
            }
            if (url === '/api/roles') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({})
                });
            }
            if (url === '/api/map/tilesets') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({})
                });
            }
            return Promise.reject(new Error(`Unhandled fetch request: ${url}`));
        }) as any;
    });

    it('renders login container when unauthenticated', async () => {
        render(<App />);

        // Wait for the auth check to complete and remove the "loading..." screen
        await waitFor(() => {
            expect(screen.getByText(/怪獸對戰/i)).toBeInTheDocument();
        });
        expect(screen.getByRole('link', { name: /Google 登入/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Login as tester/i })).toBeInTheDocument();
    });
});
