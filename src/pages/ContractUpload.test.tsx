import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../test/render';
import { ContractUpload } from './ContractUpload';

describe('ContractUpload', () => {
  it('renders upload heading', () => {
    render(<ContractUpload onUploadComplete={vi.fn()} />);
    expect(screen.getByText('Upload Contract')).toBeInTheDocument();
  });

  it('renders analyzing state', () => {
    render(<ContractUpload onUploadComplete={vi.fn()} isAnalyzing={true} />);
    expect(screen.getByText('Analyzing Contract...')).toBeInTheDocument();
  });
});
