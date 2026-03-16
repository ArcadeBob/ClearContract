import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../test/render';
import { fireEvent, waitFor } from '@testing-library/react';
import { UploadZone } from './UploadZone';

function createDtWithFiles(files: File[] = []) {
  return {
    dataTransfer: {
      files,
      items: files.map((f) => ({
        kind: 'file' as const,
        type: f.type,
        getAsFile: () => f,
      })),
      types: ['Files'],
    },
  };
}

describe('UploadZone', () => {
  it('renders default state with heading and instructions', () => {
    render(<UploadZone onFileSelect={vi.fn()} />);
    expect(screen.getByText('Upload Contract PDF')).toBeInTheDocument();
    expect(
      screen.getByText(/Drag and drop your PDF contract/)
    ).toBeInTheDocument();
    expect(screen.getByText(/PDF up to 10MB/)).toBeInTheDocument();
  });

  it('accepts valid PDF file via drop', async () => {
    const onFileSelect = vi.fn();
    const { container } = render(
      <UploadZone onFileSelect={onFileSelect} />
    );
    const file = new File(['%PDF-1.4'], 'contract.pdf', {
      type: 'application/pdf',
    });
    const dropzone = container.firstElementChild!;
    fireEvent.drop(dropzone, createDtWithFiles([file]));
    await waitFor(() => {
      expect(onFileSelect).toHaveBeenCalledWith(file);
    });
  });

  it('rejects non-PDF file via drop with error message', async () => {
    const onFileSelect = vi.fn();
    const { container } = render(
      <UploadZone onFileSelect={onFileSelect} />
    );
    const file = new File(['not-a-pdf'], 'document.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    const dropzone = container.firstElementChild!;
    fireEvent.drop(dropzone, createDtWithFiles([file]));
    expect(
      await screen.findByText('Only PDF files are accepted')
    ).toBeInTheDocument();
    expect(onFileSelect).not.toHaveBeenCalled();
  });

  it('rejects oversized file via drop with size error', async () => {
    const onFileSelect = vi.fn();
    const { container } = render(
      <UploadZone onFileSelect={onFileSelect} />
    );
    const bigFile = new File(['x'], 'huge.pdf', {
      type: 'application/pdf',
    });
    Object.defineProperty(bigFile, 'size', {
      value: 11 * 1024 * 1024,
    });
    const dropzone = container.firstElementChild!;
    fireEvent.drop(dropzone, createDtWithFiles([bigFile]));
    expect(
      await screen.findByText(/File exceeds 10MB limit/)
    ).toBeInTheDocument();
    expect(onFileSelect).not.toHaveBeenCalled();
  });

  it('renders hidden file input with accept attribute', () => {
    const { container } = render(
      <UploadZone onFileSelect={vi.fn()} />
    );
    const input = container.querySelector('input[type="file"]');
    expect(input).toBeTruthy();
    expect(input!.getAttribute('accept')).toBeTruthy();
  });

  it('shows drag-active heading on dragEnter and reverts on dragLeave', async () => {
    const { container } = render(
      <UploadZone onFileSelect={vi.fn()} />
    );
    expect(screen.getByText('Upload Contract PDF')).toBeInTheDocument();

    const dropzone = container.firstElementChild!;
    fireEvent.dragEnter(dropzone, createDtWithFiles());
    expect(
      await screen.findByText('Drop contract here')
    ).toBeInTheDocument();

    fireEvent.dragLeave(dropzone, createDtWithFiles());
    await waitFor(() => {
      expect(screen.getByText('Upload Contract PDF')).toBeInTheDocument();
    });
  });

  it('clears error message on dragEnter after rejection', async () => {
    const { container } = render(
      <UploadZone onFileSelect={vi.fn()} />
    );
    const badFile = new File(['not-a-pdf'], 'doc.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    const dropzone = container.firstElementChild!;

    // Trigger rejection to show error
    fireEvent.drop(dropzone, createDtWithFiles([badFile]));
    expect(
      await screen.findByText('Only PDF files are accepted')
    ).toBeInTheDocument();

    // dragEnter should clear the error
    fireEvent.dragEnter(dropzone, createDtWithFiles());
    await waitFor(() => {
      expect(
        screen.queryByText('Only PDF files are accepted')
      ).not.toBeInTheDocument();
    });
  });
});
