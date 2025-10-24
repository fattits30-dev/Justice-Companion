import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  thinking?: string;
}

/**
 * ChatView - AI Legal Assistant
 *
 * CRITICAL: This is a legal information tool, NOT a lawyer.
 * Every response includes a disclaimer.
 */
export function ChatView() {
  const { user: _user } = useAuth(); // Reserved for future use
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState('');
  const [_showThinking, _setShowThinking] = useState(false); // Reserved for showing AI thinking process
  const [_currentThinking, setCurrentThinking] = useState(''); // Reserved for AI thinking display

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentStreamingMessage]);

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsStreaming(true);
    setCurrentStreamingMessage('');
    setCurrentThinking('');

    try {
      // Call IPC to stream chat
      const sessionId = localStorage.getItem('sessionId');
      if (!sessionId) {
        throw new Error('No active session');
      }

      let streamedContent = '';
      let streamedThinking = '';

      await window.justiceAPI.streamChat(
        {
          sessionId,
          message: input.trim(),
          conversationId: null, // New conversation
        },
        (token: string) => {
          // Each token from AI response
          streamedContent += token;
          setCurrentStreamingMessage(streamedContent);
        },
        (thinking: string) => {
          // AI's thinking process (optional)
          streamedThinking += thinking;
          setCurrentThinking(streamedThinking);
        },
        () => {
          // Streaming complete
          const assistantMessage: Message = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: streamedContent,
            thinking: streamedThinking || undefined,
            timestamp: new Date(),
          };

          setMessages(prev => [...prev, assistantMessage]);
          setCurrentStreamingMessage('');
          setCurrentThinking('');
          setIsStreaming(false);
        },
        (error: string) => {
          // Error during streaming
          console.error('[ChatView] Streaming error:', error);
          const errorMessage: Message = {
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: `Sorry, I hit an error: ${error}\n\nTry asking again or rephrase your question.`,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, errorMessage]);
          setIsStreaming(false);
          setCurrentStreamingMessage('');
          setCurrentThinking('');
        }
      );
    } catch (error) {
      console.error('[ChatView] Send error:', error);
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Header with BIG legal disclaimer */}
      <div className="flex-shrink-0 border-b border-gray-700 bg-gray-800">
        <div className="p-6">
          <h1 className="text-3xl font-bold mb-3">AI Legal Assistant</h1>
          <div className="bg-amber-900/30 border-l-4 border-amber-500 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-semibold text-amber-200 mb-1">This AI provides legal information, NOT legal advice</p>
                <p className="text-sm text-amber-100/80">
                  I can help you understand legal concepts, research case law, and organize your thinking.
                  But I'm NOT a lawyer and can't give you advice on what to do in your specific situation.
                  For legal advice, talk to a qualified solicitor.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 && !isStreaming && (
          <div className="max-w-3xl mx-auto mt-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500/20 rounded-full mb-6">
              <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-3">How can I help you today?</h2>
            <p className="text-gray-400 mb-8">
              Ask me about UK employment law, case precedents, or help organizing your case.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <button
                onClick={() => setInput('What are my rights if I\'m being bullied at work?')}
                className="p-4 bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-lg transition-colors text-left"
              >
                <p className="font-medium mb-1">Workplace Rights</p>
                <p className="text-sm text-gray-400">Understand your protections against bullying</p>
              </button>

              <button
                onClick={() => setInput('How do I gather evidence for an unfair dismissal claim?')}
                className="p-4 bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-lg transition-colors text-left"
              >
                <p className="font-medium mb-1">Building Your Case</p>
                <p className="text-sm text-gray-400">Learn what evidence you need</p>
              </button>

              <button
                onClick={() => setInput('What is constructive dismissal?')}
                className="p-4 bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-lg transition-colors text-left"
              >
                <p className="font-medium mb-1">Legal Concepts</p>
                <p className="text-sm text-gray-400">Get clear explanations of legal terms</p>
              </button>

              <button
                onClick={() => setInput('What should I do if I\'m being discriminated against?')}
                className="p-4 bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-lg transition-colors text-left"
              >
                <p className="font-medium mb-1">Discrimination</p>
                <p className="text-sm text-gray-400">Know your rights and next steps</p>
              </button>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-3xl ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm'
                  : 'bg-gray-800 border border-gray-700 rounded-2xl rounded-tl-sm'
              } p-4`}
            >
              {message.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-2 text-sm text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>AI Assistant</span>
                </div>
              )}

              <div className="prose prose-invert max-w-none">
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>

              {message.thinking && _showThinking && (
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer text-gray-400 hover:text-gray-300">
                    View AI reasoning process
                  </summary>
                  <div className="mt-2 p-3 bg-gray-900/50 rounded border border-gray-700">
                    <p className="text-gray-400 whitespace-pre-wrap">{message.thinking}</p>
                  </div>
                </details>
              )}

              <div className="mt-2 text-xs text-gray-500">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {/* Streaming message */}
        {isStreaming && currentStreamingMessage && (
          <div className="flex justify-start">
            <div className="max-w-3xl bg-gray-800 border border-gray-700 rounded-2xl rounded-tl-sm p-4">
              <div className="flex items-center gap-2 mb-2 text-sm text-gray-400">
                <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>AI Assistant</span>
                <span className="ml-2 text-green-400">● Responding...</span>
              </div>
              <div className="prose prose-invert max-w-none">
                <p className="whitespace-pre-wrap">{currentStreamingMessage}<span className="animate-pulse">▊</span></p>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 border-t border-gray-700 bg-gray-800 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about UK employment law..."
              disabled={isStreaming}
              className="flex-1 bg-gray-900 border border-gray-700 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
              rows={3}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              className="px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
            >
              {isStreaming ? (
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Press Enter to send, Shift+Enter for new line
          </div>
        </div>
      </div>
    </div>
  );
}
