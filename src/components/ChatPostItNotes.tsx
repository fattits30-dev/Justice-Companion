import { useState } from 'react';

export function ChatPostItNotes() {
  const [userFacts, setUserFacts] = useState('User Facts:\n• Name:\n• Location:\n• Issue:');
  const [caseFacts, setCaseFacts] = useState('Case Facts:\n• Case Type:\n• Key Dates:\n• Parties Involved:');
  const [editingUser, setEditingUser] = useState(false);
  const [editingCase, setEditingCase] = useState(false);

  return (
    <div className="mb-8 flex justify-center">
      {/* Post-it Notes Container - Centered */}
      <div className="flex gap-6 items-start">
        {/* User Facts Note - Blue */}
        <div
          className="
            bg-gradient-to-br from-blue-200 via-blue-100 to-blue-200
            shadow-lg shadow-blue-400/50
            w-72 min-h-[200px] p-5 rounded-sm
            transform transition-all duration-300 ease-out
            hover:scale-105 hover:rotate-0 hover:shadow-xl
            cursor-pointer relative group
            animate-in slide-in-from-top-4 fade-in duration-500
          "
          style={{
            transform: 'rotate(-2deg)',
          }}
        >
          {/* Post-it top tape effect */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-20 h-4 bg-blue-600/20 rounded-sm shadow-sm" />

          {/* Title */}
          <h3 className="text-blue-800 font-bold text-lg mb-3 font-['Segoe_Print','Comic_Sans_MS',cursive]">
            👤 User Facts
          </h3>

          {/* Note content */}
          {editingUser ? (
            <textarea
              value={userFacts}
              onChange={(e) => setUserFacts(e.target.value)}
              onBlur={() => setEditingUser(false)}
              autoFocus
              className="w-full h-36 bg-transparent border-none outline-none resize-none text-gray-800 placeholder-gray-500 font-['Segoe_Print','Comic_Sans_MS',cursive] text-sm leading-relaxed"
              placeholder="AI will learn and jot down user facts..."
            />
          ) : (
            <div
              onClick={() => setEditingUser(true)}
              className="w-full h-36 text-gray-800 font-['Segoe_Print','Comic_Sans_MS',cursive] text-sm leading-relaxed whitespace-pre-wrap break-words overflow-auto"
            >
              {userFacts}
            </div>
          )}

          {/* Note footer with shadow line */}
          <div className="absolute bottom-3 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400/30 to-transparent" />
        </div>

        {/* Case Facts Note - Yellow */}
        <div
          className="
            bg-gradient-to-br from-yellow-200 via-yellow-100 to-yellow-200
            shadow-lg shadow-yellow-400/50
            w-72 min-h-[200px] p-5 rounded-sm
            transform transition-all duration-300 ease-out
            hover:scale-105 hover:rotate-0 hover:shadow-xl
            cursor-pointer relative group
            animate-in slide-in-from-top-4 fade-in duration-500
          "
          style={{
            transform: 'rotate(2deg)',
            animationDelay: '100ms',
          }}
        >
          {/* Post-it top tape effect */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-20 h-4 bg-yellow-600/20 rounded-sm shadow-sm" />

          {/* Title */}
          <h3 className="text-yellow-800 font-bold text-lg mb-3 font-['Segoe_Print','Comic_Sans_MS',cursive]">
            ⚖️ Case Facts
          </h3>

          {/* Note content */}
          {editingCase ? (
            <textarea
              value={caseFacts}
              onChange={(e) => setCaseFacts(e.target.value)}
              onBlur={() => setEditingCase(false)}
              autoFocus
              className="w-full h-36 bg-transparent border-none outline-none resize-none text-gray-800 placeholder-gray-500 font-['Segoe_Print','Comic_Sans_MS',cursive] text-sm leading-relaxed"
              placeholder="AI will learn and jot down case facts..."
            />
          ) : (
            <div
              onClick={() => setEditingCase(true)}
              className="w-full h-36 text-gray-800 font-['Segoe_Print','Comic_Sans_MS',cursive] text-sm leading-relaxed whitespace-pre-wrap break-words overflow-auto"
            >
              {caseFacts}
            </div>
          )}

          {/* Note footer with shadow line */}
          <div className="absolute bottom-3 left-0 right-0 h-px bg-gradient-to-r from-transparent via-yellow-400/30 to-transparent" />
        </div>
      </div>
    </div>
  );
}
