import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TokenPeek, { decodeJwt } from './TokenPeek.jsx';

const encode = (value) => btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const payload = { sub: 'user-123', email: 'alice@demo.test', role: 'authenticated', iat: 1999996400, exp: 2000000000 };
const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature-goes-here`;

describe('decodeJwt', () => {
  it('reads the header and payload', () => {
    const decoded = decodeJwt(token);
    expect(decoded.header).toEqual({ alg: 'HS256', typ: 'JWT' });
    expect(decoded.payload).toEqual(payload);
  });
});

describe('TokenPeek', () => {
  it('shows what is inside the token', () => {
    render(<TokenPeek token={token} />);
    expect(screen.getByRole('cell', { name: 'user-123' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'alice@demo.test' })).toBeInTheDocument();
    expect(screen.getByText(/encoded, not encrypted/)).toBeInTheDocument();
  });
});
