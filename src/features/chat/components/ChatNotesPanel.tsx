import { useState } from 'react';
import { StickyNote, X, Plus } from 'lucide-react';

interface ChatNote {
  id: number;
  content: string;
  color: 'yellow' | 'blue' | 'green' | 'pink' | 'purple';
}

const colorStyles = {
  yellow: 'bg-gradient-to-br from-yellow-100 to-yellow-200 border-yellow-400',
  blue: 'bg-gradient-to-br from-blue-100 to-blue-200 border-blue-400',
  green: 'bg-gradient-to-br from-green-100 to-green-200 border-green-400',
  pink: 'bg-gradient-to-br from-pink-100 to-pink-200 border-pink-400',
  purple: 'bg-gradient-to-br from-purple-100 to-purple-200 border-purple-400',
};

export function ChatNotesPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState<ChatNote[]>([]);
  const [nextId, setNextId] = useState(1);

  const addNote = () => {
    const colors: Array<'yellow' | 'blue' | 'green' | 'pink' | 'purple'> =
      ['yellow', 'blue', 'green', 'pink', 'purple'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newNote: ChatNote = {
      id: nextId,
      content: '',
      color: randomColor,
    };

    setNotes([...notes, newNote]);
    setNextId(nextId + 1);
  };

  const updateNote = (id: number, content: string) => {
    setNotes(notes.map(note =>
      note.id === id ? { ...note, content } : note,
    ));
  };

  const deleteNote = (id: number) => {
    setNotes(notes.filter(note => note.id !== id));
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed right-4 top-20 z-40 p-3 bg-yellow-400 hover:bg-yellow-500 rounded-full shadow-lg transition-all"
        title="Toggle Notes"
      >
        <StickyNote className="w-5 h-5 text-yellow-900" />
      </button>

      {/* Notes Panel */}
      {isOpen && (
        <div className="fixed right-4 top-36 z-40 w-80 max-h-[70vh] bg-slate-800/95 backdrop-blur-sm border border-blue-700/50 rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-blue-700/50 bg-slate-900/50">
            <div className="flex items-center gap-2">
              <StickyNote className="w-5 h-5 text-yellow-400" />
              <h3 className="font-semibold text-white">Quick Notes</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={addNote}
                className="p-1.5 hover:bg-blue-700/30 rounded-lg transition-colors"
                title="Add note"
              >
                <Plus className="w-4 h-4 text-blue-300" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-blue-700/30 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-blue-300" />
              </button>
            </div>
          </div>

          {/* Notes List */}
          <div className="p-4 space-y-3 overflow-y-auto max-h-[calc(70vh-60px)]">
            {notes.length === 0 ? (
              <div className="text-center py-8 text-blue-300 text-sm">
                <p>No notes yet.</p>
                <p className="text-xs text-blue-400 mt-2">Click + to add a note</p>
              </div>
            ) : (
              notes.map(note => (
                <div
                  key={note.id}
                  className={`${colorStyles[note.color]} border-2 rounded-lg p-3 shadow-md relative group`}
                >
                  <button
                    onClick={() => deleteNote(note.id)}
                    className="absolute top-2 right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs font-bold"
                    title="Delete note"
                  >
                    ×
                  </button>
                  <textarea
                    value={note.content}
                    onChange={(e) => updateNote(note.id, e.target.value)}
                    placeholder="Type your note here..."
                    className="w-full bg-transparent border-none outline-none resize-none text-sm text-gray-800 placeholder-gray-500 min-h-[80px] font-['Segoe_Print','Comic_Sans_MS',cursive]"
                  />
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}
