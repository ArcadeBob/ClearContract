import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  storagePath,
  uploadPdf,
  downloadPdf,
  deleteContractPdfs,
  pdfExists,
} from '../supabaseStorage';

// ---------------------------------------------------------------------------
// Mock Supabase client factory
// ---------------------------------------------------------------------------

function createMockSupabase(overrides: {
  upload?: () => Promise<{ error: { message: string } | null }>;
  download?: () => Promise<{ data: Blob | null; error: { message: string } | null }>;
  remove?: () => Promise<{ error: { message: string } | null }>;
  list?: () => Promise<{ data: { name: string }[] | null; error: { message: string } | null }>;
} = {}) {
  const upload = overrides.upload ?? vi.fn().mockResolvedValue({ error: null });
  const download =
    overrides.download ??
    vi.fn().mockResolvedValue({ data: new Blob(['pdf']), error: null });
  const remove = overrides.remove ?? vi.fn().mockResolvedValue({ error: null });
  const list =
    overrides.list ??
    vi.fn().mockResolvedValue({ data: [], error: null });

  const from = vi.fn().mockReturnValue({ upload, download, remove, list });

  return {
    client: { storage: { from } } as any,
    from,
    upload,
    download,
    remove,
    list,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('storagePath', () => {
  it('returns {userId}/{contractId}/{role}.pdf', () => {
    expect(storagePath('u1', 'c1', 'contract')).toBe('u1/c1/contract.pdf');
    expect(storagePath('u2', 'c99', 'bid')).toBe('u2/c99/bid.pdf');
  });
});

describe('uploadPdf', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('uploads with correct path, contentType, and upsert', async () => {
    const { client, from, upload } = createMockSupabase();
    const buf = Buffer.from('pdf-data');

    await uploadPdf(client, 'u1', 'c1', 'contract', buf);

    expect(from).toHaveBeenCalledWith('contract-pdfs');
    expect(upload).toHaveBeenCalledWith('u1/c1/contract.pdf', buf, {
      contentType: 'application/pdf',
      upsert: true,
    });
  });

  it('does not throw on success', async () => {
    const { client } = createMockSupabase();
    await expect(
      uploadPdf(client, 'u1', 'c1', 'bid', Buffer.from('x'))
    ).resolves.toBeUndefined();
  });

  it('logs error but does not throw on failure', async () => {
    const { client } = createMockSupabase({
      upload: vi.fn().mockResolvedValue({ error: { message: 'quota exceeded' } }),
    });

    await expect(
      uploadPdf(client, 'u1', 'c1', 'contract', Buffer.from('x'))
    ).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Upload failed')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('quota exceeded')
    );
  });
});

describe('downloadPdf', () => {
  it('returns a Buffer on success', async () => {
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF
    const blob = { arrayBuffer: () => Promise.resolve(pdfBytes.buffer) };
    const { client } = createMockSupabase({
      download: vi.fn().mockResolvedValue({ data: blob, error: null }),
    });

    const result = await downloadPdf(client, 'u1', 'c1', 'contract');

    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result).toEqual(Buffer.from(pdfBytes));
  });

  it('returns null when an error occurs', async () => {
    const { client } = createMockSupabase({
      download: vi
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'not found' } }),
    });

    const result = await downloadPdf(client, 'u1', 'c1', 'bid');
    expect(result).toBeNull();
  });

  it('returns null when data is null (no error)', async () => {
    const { client } = createMockSupabase({
      download: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    const result = await downloadPdf(client, 'u1', 'c1', 'contract');
    expect(result).toBeNull();
  });
});

describe('deleteContractPdfs', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('calls remove with both contract and bid paths', async () => {
    const { client, remove } = createMockSupabase();

    await deleteContractPdfs(client, 'u1', 'c1');

    expect(remove).toHaveBeenCalledWith([
      'u1/c1/contract.pdf',
      'u1/c1/bid.pdf',
    ]);
  });

  it('logs error but does not throw on failure', async () => {
    const { client } = createMockSupabase({
      remove: vi.fn().mockResolvedValue({ error: { message: 'forbidden' } }),
    });

    await expect(deleteContractPdfs(client, 'u1', 'c1')).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Delete failed')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('forbidden')
    );
  });
});

describe('pdfExists', () => {
  it('returns true when the file is in the listing', async () => {
    const { client } = createMockSupabase({
      list: vi.fn().mockResolvedValue({
        data: [{ name: 'contract.pdf' }],
        error: null,
      }),
    });

    const result = await pdfExists(client, 'u1', 'c1', 'contract');
    expect(result).toBe(true);
  });

  it('returns false when the listing is empty', async () => {
    const { client } = createMockSupabase({
      list: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    const result = await pdfExists(client, 'u1', 'c1', 'bid');
    expect(result).toBe(false);
  });

  it('returns false when an error occurs', async () => {
    const { client } = createMockSupabase({
      list: vi.fn().mockResolvedValue({ data: null, error: { message: 'err' } }),
    });

    const result = await pdfExists(client, 'u1', 'c1', 'contract');
    expect(result).toBe(false);
  });

  it('passes correct directory and search option to list', async () => {
    const listFn = vi.fn().mockResolvedValue({ data: [], error: null });
    const { client } = createMockSupabase({ list: listFn });

    await pdfExists(client, 'u1', 'c1', 'bid');

    expect(listFn).toHaveBeenCalledWith('u1/c1', { search: 'bid.pdf' });
  });
});
