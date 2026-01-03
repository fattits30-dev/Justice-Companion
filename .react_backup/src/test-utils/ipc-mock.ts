/**
 * Test utilities for IPC mocking
 */

/**
 * Mock window.justiceAPI for testing
 */
export function setupTestEnvironment() {
  // Mock the global window.justiceAPI
  const mockJusticeAPI = {
    login: () => Promise.resolve({ success: true }),
    register: () => Promise.resolve({ success: true }),
    logout: () => Promise.resolve(void 0),
    getSession: () =>
      Promise.resolve({ success: true, data: { id: "test-session" } }),
    getAllCases: () => Promise.resolve({ success: true, data: [] }),
    createCase: () =>
      Promise.resolve({ success: true, data: { id: 123, title: "Test Case" } }),
    updateCase: () => Promise.resolve({ success: true }),
    deleteCase: () => Promise.resolve(void 0),
    streamChat: () => Promise.resolve(),
    analyzeDocument: () =>
      Promise.resolve({ success: true, data: { analysis: "Test analysis" } }),
    createCaseFact: () => Promise.resolve({ success: true }),
    showOpenDialog: () =>
      Promise.resolve({ canceled: false, filePaths: ["/test/file.pdf"] }),
  };

  // Mock the global window object
  global.window = {
    ...global.window,
    justiceAPI: mockJusticeAPI,
  } as any;

  return mockJusticeAPI;
}

/**
 * Clear window mock after tests
 */
export function clearWindowMock() {
  if (global.window && (global.window as any).justiceAPI) {
    delete (global.window as any).justiceAPI;
  }
}

/**
 * Mock IPC renderer for Electron tests
 */
export function mockIPCRenderer() {
  const mockIPC = {
    invoke: () => Promise.resolve({ success: true }),
    on: () => {},
    removeListener: () => {},
    send: () => {},
  };

  return mockIPC;
}
