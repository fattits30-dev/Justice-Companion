import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { SettingsView } from './SettingsView.tsx';

vi.mock('../contexts/AuthContext.tsx', () => ({
  useAuth: () => ({
    user: {
      username: 'test-user',
      email: 'test@example.com',
    },
  }),
}));

describe('SettingsView secure storage integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('checks secure storage for provider credentials on mount', async () => {
    const hasMock = vi.fn().mockResolvedValue({ success: true, data: true });
    const getMock = vi.fn().mockResolvedValue({ success: true, data: 'llama-3.3-70b-versatile' });

    window.justiceAPI.secureStorageHas = hasMock;
    window.justiceAPI.secureStorageGet = getMock;

    render(<SettingsView />);

    await waitFor(() => {
      expect(hasMock).toHaveBeenCalledWith('groq_api_key');
    });

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith('groq_model');
    });

    const apiKeyField = await screen.findByPlaceholderText('gsk_...');
    await waitFor(() => {
      expect(apiKeyField).not.toHaveValue('');
    });
  });

  it('keeps API key empty when secure storage has no key', async () => {
    const hasMock = vi.fn().mockResolvedValue({ success: true, data: false });
    const getMock = vi.fn().mockResolvedValue({ success: true, data: null });

    window.justiceAPI.secureStorageHas = hasMock;
    window.justiceAPI.secureStorageGet = getMock;

    render(<SettingsView />);

    await waitFor(() => {
      expect(hasMock).toHaveBeenCalledWith('groq_api_key');
    });

    const apiKeyField = await screen.findByPlaceholderText('gsk_...');
    await waitFor(() => {
      expect(apiKeyField).toHaveValue('');
    });
  });
});
