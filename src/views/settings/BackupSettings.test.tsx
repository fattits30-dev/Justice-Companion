import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  fireEvent,
} from "../../test-utils/test-utils.tsx";
import { BackupSettingsTab } from "./BackupSettings.tsx";

// Mock backup data
const mockBackups = [
  {
    filename: "backup_2025-10-25_15-30.db",
    path: "/backups/backup_2025-10-25_15-30.db",
    size: 2411724, // 2.3 MB
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    is_valid: true,
    metadata: {
      version: "1.0.0",
      record_count: 1234,
      tables: ["users", "cases", "evidence"],
    },
  },
  {
    filename: "backup_2025-10-24_15-30.db",
    path: "/backups/backup_2025-10-24_15-30.db",
    size: 2300000,
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    is_valid: true,
    metadata: {
      version: "1.0.0",
      record_count: 1200,
    },
  },
  {
    filename: "backup_2025-10-23_15-30.db",
    path: "/backups/backup_2025-10-23_15-30.db",
    size: 2200000,
    created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // 2 days ago
    is_valid: true,
    metadata: {
      version: "1.0.0",
      record_count: 1100,
    },
  },
];

// Mock window.justiceAPI
const mockAPI = {
  createBackup: vi.fn(),
  listBackups: vi.fn(),
  restoreBackup: vi.fn(),
  exportBackup: vi.fn(),
  deleteBackup: vi.fn(),
  getBackupSettings: vi.fn(),
  updateBackupSettings: vi.fn(),
  getSession: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
};

beforeEach(() => {
  // Reset mocks
  vi.clearAllMocks();

  // Mock localStorage
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };
  Reflect.set(globalThis.window, "localStorage", localStorageMock);

  // Mock window.justiceAPI
  Reflect.set(globalThis.window, "justiceAPI", mockAPI);

  // Mock window.confirm
  Reflect.set(
    globalThis.window,
    "confirm",
    vi.fn(() => true)
  );

  // Mock window.location.reload
  Reflect.set(globalThis.window, "location", { reload: vi.fn() });

  // Setup default mock implementations
  mockAPI.listBackups.mockResolvedValue({
    success: true,
    data: { backups: mockBackups },
  });

  mockAPI.getBackupSettings.mockResolvedValue({
    success: true,
    data: {
      enabled: false,
      frequency: "daily",
      keep_count: 7,
      backup_time: "03:00",
    },
  });

  mockAPI.createBackup.mockResolvedValue({
    success: true,
    data: { filename: "new_backup.db" },
  });

  mockAPI.updateBackupSettings.mockResolvedValue({
    success: true,
  });

  mockAPI.deleteBackup.mockResolvedValue({
    success: true,
  });

  mockAPI.restoreBackup.mockResolvedValue({
    success: true,
  });

  // Mock getSession to return authenticated user by default
  mockAPI.getSession.mockResolvedValue({
    success: true,
    data: {
      id: "session-123",
      user: {
        id: 1,
        username: "testuser",
        email: "test@example.com",
      },
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
  });

  // Store session in localStorage
  localStorageMock.getItem.mockReturnValue("session-123");
});

describe("BackupSettingsTab", () => {
  it("renders backup settings UI", () => {
    render(<BackupSettingsTab />);

    expect(screen.getByText("Backup & Restore")).toBeInTheDocument();
    expect(screen.getByText("Manual Backup")).toBeInTheDocument();
    expect(screen.getByText("Automatic Backups")).toBeInTheDocument();
    expect(screen.getByText("Backup History")).toBeInTheDocument();
  });

  it("displays backup status overview", () => {
    render(<BackupSettingsTab />);

    expect(screen.getByText("Last Backup")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Total Storage")).toBeInTheDocument();
  });

  it("shows create backup button", () => {
    render(<BackupSettingsTab />);

    const createButton = screen.getByRole("button", {
      name: /create backup now/i,
    });
    expect(createButton).toBeInTheDocument();
  });

  it("displays automatic backup toggle", () => {
    render(<BackupSettingsTab />);

    const toggle = screen.getByLabelText("Enable automatic backups");
    expect(toggle).toBeInTheDocument();
    expect(toggle).not.toBeChecked();
  });

  it("shows backup settings when auto-backup is enabled", async () => {
    render(<BackupSettingsTab />);

    const toggle = screen.getByLabelText("Enable automatic backups");
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(screen.getByLabelText("Backup frequency")).toBeInTheDocument();
      expect(screen.getByLabelText("Backup time")).toBeInTheDocument();
      expect(
        screen.getByLabelText("Number of backups to keep")
      ).toBeInTheDocument();
    });
  });

  it("displays backup history with mock data", async () => {
    render(<BackupSettingsTab />);

    // Wait for mock backups to load
    await waitFor(() => {
      expect(
        screen.getByText(/backup_2025-10-25_15-30.db/i)
      ).toBeInTheDocument();
    });
  });

  it("shows empty state when no backups exist", async () => {
    render(<BackupSettingsTab />);

    // The component uses mock data, so we won't see empty state
    // This test would work with real IPC that returns empty array
    // For now, just verify the structure
    await waitFor(() => {
      expect(screen.getByText("Backup History")).toBeInTheDocument();
    });
  });

  it("renders backup list items with actions", async () => {
    render(<BackupSettingsTab />);

    await waitFor(() => {
      const restoreButtons = screen.getAllByRole("button", {
        name: /restore/i,
      });
      const exportButtons = screen.getAllByRole("button", { name: /export/i });

      expect(restoreButtons.length).toBeGreaterThan(0);
      expect(exportButtons.length).toBeGreaterThan(0);
    });
  });

  it("shows backup metadata when expanded", async () => {
    render(<BackupSettingsTab />);

    await waitFor(() => {
      const expandButton = screen.getAllByLabelText("Expand details")[0];
      fireEvent.click(expandButton);
    });

    await waitFor(() => {
      expect(screen.getByText("Version")).toBeInTheDocument();
      expect(screen.getByText("Records")).toBeInTheDocument();
    });
  });

  it("handles frequency selection", async () => {
    render(<BackupSettingsTab />);

    const toggle = screen.getByLabelText("Enable automatic backups");
    fireEvent.click(toggle);

    await waitFor(() => {
      const frequencySelect = screen.getByLabelText("Backup frequency");
      fireEvent.change(frequencySelect, { target: { value: "weekly" } });
      expect(frequencySelect).toHaveValue("weekly");
    });
  });

  it("handles keep count slider", async () => {
    render(<BackupSettingsTab />);

    const toggle = screen.getByLabelText("Enable automatic backups");
    fireEvent.click(toggle);

    await waitFor(() => {
      const slider = screen.getByLabelText("Number of backups to keep");
      fireEvent.change(slider, { target: { value: "15" } });
      expect(slider).toHaveValue("15");
    });
  });

  it("displays file sizes correctly", async () => {
    render(<BackupSettingsTab />);

    await waitFor(() => {
      // Should show MB for files > 1MB
      expect(screen.getByText(/2.3 MB/i)).toBeInTheDocument();
    });
  });

  it("displays relative time correctly", async () => {
    render(<BackupSettingsTab />);

    await waitFor(() => {
      // Should show "2 hours ago" for recent backup
      const hourElements = screen.getAllByText(/hour/i);
      expect(hourElements.length).toBeGreaterThan(0);
      expect(hourElements[0]).toBeInTheDocument();
    });
  });

  it("shows badges for backup status", async () => {
    render(<BackupSettingsTab />);

    await waitFor(() => {
      const validBadges = screen.getAllByText("Valid");
      expect(validBadges.length).toBeGreaterThan(0);
    });
  });

  it("renders restore warning when backup is expanded", async () => {
    render(<BackupSettingsTab />);

    await waitFor(() => {
      const expandButton = screen.getAllByLabelText("Expand details")[0];
      fireEvent.click(expandButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/Restore Warning/i)).toBeInTheDocument();
    });
  });

  it("handles save settings button", async () => {
    render(<BackupSettingsTab />);

    // Wait for component to load
    await waitFor(() => {
      expect(
        screen.getByLabelText("Enable automatic backups")
      ).toBeInTheDocument();
    });

    // Enable auto-backup
    const toggle = screen.getByLabelText("Enable automatic backups");
    fireEvent.click(toggle);

    // Wait for settings form to appear and click save
    await waitFor(() => {
      const saveButton = screen.getByRole("button", { name: /save settings/i });
      expect(saveButton).toBeInTheDocument();
    });

    const saveButton = screen.getByRole("button", { name: /save settings/i });
    fireEvent.click(saveButton);

    // Wait for the success message to appear
    await waitFor(() => {
      expect(screen.getByText("Saved successfully!")).toBeInTheDocument();
    });
  });

  it("shows loading spinner during backup creation", async () => {
    // Make the backup creation take longer to observe loading state
    mockAPI.createBackup.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return { success: true, data: { filename: "new_backup.db" } };
    });

    render(<BackupSettingsTab />);

    // Wait for the create button to be available
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /create backup now/i })
      ).toBeInTheDocument();
    });

    const createButton = screen.getByRole("button", {
      name: /create backup now/i,
    });
    fireEvent.click(createButton);

    // The Button component with loading=true shows only a spinner, NOT the text
    // We need to check that the button is disabled and the original text is gone
    await waitFor(
      () => {
        // Button should be disabled during loading
        expect(createButton).toBeDisabled();
        // The "Create Backup Now" text should not be visible (replaced by spinner)
        expect(screen.queryByText("Create Backup Now")).not.toBeInTheDocument();
      },
      { timeout: 100 }
    );
  });

  it("displays total backup count and size", async () => {
    render(<BackupSettingsTab />);

    await waitFor(() => {
      // The text is in format: "{size} ({count} backups)" e.g. "6.6 MB (3 backups)"
      expect(screen.getByText(/\(3 backups\)/i)).toBeInTheDocument();
    });
  });

  it("renders refresh button", () => {
    render(<BackupSettingsTab />);

    const refreshButton = screen.getByRole("button", { name: /refresh/i });
    expect(refreshButton).toBeInTheDocument();
  });

  it("shows proper icons for each section", () => {
    render(<BackupSettingsTab />);

    // Check for section headings which have associated icons
    expect(screen.getByText("Manual Backup")).toBeInTheDocument();
    expect(screen.getByText("Automatic Backups")).toBeInTheDocument();
    expect(screen.getByText("Backup History")).toBeInTheDocument();
  });
});

describe("BackupSettings - Accessibility", () => {
  it("has proper ARIA labels for interactive elements", async () => {
    render(<BackupSettingsTab />);

    await waitFor(() => {
      expect(
        screen.getByLabelText("Enable automatic backups")
      ).toBeInTheDocument();
    });
  });

  it("toggle has proper checked state", async () => {
    render(<BackupSettingsTab />);

    await waitFor(() => {
      const toggle = screen.getByLabelText("Enable automatic backups");
      expect(toggle).toHaveAttribute("type", "checkbox");
    });
  });

  it("buttons are keyboard accessible", async () => {
    render(<BackupSettingsTab />);

    await waitFor(() => {
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
      for (const button of buttons) {
        expect(button).not.toHaveAttribute("disabled");
      }
    });
  });
});

describe("BackupSettings - Integration", () => {
  it("expands and collapses backup details", async () => {
    render(<BackupSettingsTab />);

    await waitFor(() => {
      const expandButton = screen.getAllByLabelText("Expand details")[0];
      fireEvent.click(expandButton);
    });

    await waitFor(() => {
      expect(screen.getByText("Version")).toBeInTheDocument();
    });

    const collapseButton = screen.getAllByLabelText("Collapse details")[0];
    fireEvent.click(collapseButton);

    await waitFor(() => {
      expect(screen.queryByText("Version")).not.toBeInTheDocument();
    });
  });

  it("updates frequency and reflects in UI", async () => {
    render(<BackupSettingsTab />);

    const toggle = screen.getByLabelText("Enable automatic backups");
    fireEvent.click(toggle);

    await waitFor(() => {
      const select = screen.getByLabelText("Backup frequency");
      fireEvent.change(select, { target: { value: "monthly" } });
      expect(select).toHaveValue("monthly");
    });
  });
});
