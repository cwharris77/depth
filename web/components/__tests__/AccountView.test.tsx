import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AccountView from '@/components/AccountView';

vi.mock('@/lib/hooks/use-user', () => ({
  useUser: () => ({ user: null, loading: false }),
}));

afterEach(cleanup);

describe('AccountView sign-in disclosure', () => {
  it('shows separate Terms and Privacy links before email submission', () => {
    render(<AccountView teams={[]} />);

    const submit = screen.getByRole('button', { name: 'Email me a sign-in code' });
    const terms = screen.getByRole('link', { name: 'Terms of Service' });
    const privacy = screen.getByRole('link', { name: 'Privacy Policy' });

    expect(screen.getByText(/By continuing, you agree to our/)).toBeInTheDocument();
    expect(terms).toHaveAttribute('href', '/terms');
    expect(privacy).toHaveAttribute('href', '/privacy');
    expect(terms.compareDocumentPosition(submit) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(privacy.compareDocumentPosition(submit) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
