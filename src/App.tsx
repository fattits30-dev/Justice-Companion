import { useEffect } from 'react';
import { DisclaimerBanner } from './components/DisclaimerBanner';
import { ChatWindow } from './components/ChatWindow';

function App() {
  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      // Ctrl+Enter is handled by ChatInput component
      // This is for global shortcuts like Escape to clear errors
      if (e.key === 'Escape') {
        // Future: Clear error state
        // For now, just prevent default
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="h-screen flex flex-col">
      <DisclaimerBanner />
      <ChatWindow />
    </div>
  );
}

export default App;
