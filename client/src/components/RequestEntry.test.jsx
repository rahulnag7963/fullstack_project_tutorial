import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import RequestEntry from './RequestEntry.jsx';

const postRecord = {
  id: 1,
  method: 'POST',
  url: '/api/todos',
  path: '/api/todos',
  search: '',
  requestHeaders: { authorization: 'Bearer eyJhbGciOiJIUzI1NiIs…', 'content-type': 'application/json' },
  requestBody: { title: 'Read' },
  status: 201,
  responseBody: { id: 'abc', title: 'Read' },
  error: null,
  durationMs: 42,
};

describe('RequestEntry', () => {
  it('explains a POST in plain English', () => {
    render(<RequestEntry record={postRecord} />);
    expect(screen.getByRole('heading', { name: 'POST · CREATE' })).toBeInTheDocument();
    expect(screen.getByText('201 Created')).toBeInTheDocument();
    expect(screen.getByText(/Like mailing a letter/)).toBeInTheDocument();
    expect(screen.getByText("server/src/routes/todos.js → router.post('/')")).toBeInTheDocument();
  });

  it('points out the token header', () => {
    render(<RequestEntry record={postRecord} />);
    expect(screen.getByText(/This is your wristband/)).toBeInTheDocument();
  });

  it('shows a network failure', () => {
    render(<RequestEntry record={{ ...postRecord, status: null, responseBody: null, error: 'Failed to fetch' }} />);
    expect(screen.getByText('Network error')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'SERVER ERROR' })).toBeInTheDocument();
  });
});
