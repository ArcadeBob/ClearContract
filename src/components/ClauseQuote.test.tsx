import { describe, it, expect } from 'vitest';
import { render, screen } from '../test/render';
import { ClauseQuote } from './ClauseQuote';

describe('ClauseQuote', () => {
  it('renders clause text and reference', () => {
    render(<ClauseQuote text="The contractor shall..." reference="Section 5.2" />);
    expect(screen.getByText('The contractor shall...')).toBeInTheDocument();
    expect(screen.getByText(/Section 5\.2/)).toBeInTheDocument();
  });
});
