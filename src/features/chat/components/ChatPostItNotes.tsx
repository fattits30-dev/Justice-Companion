import { useEffect, useState } from 'react';
import type { CaseFact } from '../../../models/CaseFact';

interface ChatPostItNotesProps {
  caseId?: number | null;
}

/**
 * ChatPostItNotes - AI-Controlled Fact Display
 *
 * Displays facts that the AI has gathered and stored in the database.
 * Read-only - facts are automatically populated by AI function calling.
 *
 * Categories displayed:
 * - User Facts: Parties, witnesses, personal info
 * - Case Facts: Timelines, evidence, events, locations
 *
 * @param caseId - Case ID to load facts for
 */
export function ChatPostItNotes({ caseId }: ChatPostItNotesProps) {
  const [userFacts, setUserFacts] = useState<string>('');
  const [caseFacts, setCaseFacts] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Fetch facts whenever caseId changes
  useEffect(() => {
    const loadFacts = async () => {
      if (!caseId || !window.justiceAPI) {
        // No case selected - show empty state
        setUserFacts('👤 No user facts yet\n\nSelect a case and chat with the AI to gather facts.');
        setCaseFacts(
          '⚖️ No case facts yet\n\nThe AI will automatically store important information here.',
        );
        return;
      }

      setLoading(true);

      try {
        // Fetch all facts for this case
        const response = await window.justiceAPI.getFacts(caseId);

        if (!response.success) {
          throw new Error(response.error);
        }

        const facts: CaseFact[] = response.data;

        // Separate facts by category
        const userCategories = ['witness', 'other']; // User-related facts
        const caseCategories = ['timeline', 'evidence', 'location', 'communication']; // Case-related facts

        const userFactsList = facts.filter((f) => userCategories.includes(f.factCategory));
        const caseFactsList = facts.filter((f) => caseCategories.includes(f.factCategory));

        // Format user facts
        if (userFactsList.length === 0) {
          setUserFacts(
            '👤 No user facts yet\n\nThe AI will gather information about parties and witnesses here.',
          );
        } else {
          const formatted = userFactsList.map((f, i) => `${i + 1}. ${f.factContent}`).join('\n\n');
          setUserFacts(`👤 User Facts (${userFactsList.length})\n\n${formatted}`);
        }

        // Format case facts
        if (caseFactsList.length === 0) {
          setCaseFacts(
            '⚖️ No case facts yet\n\nThe AI will gather timeline, evidence, and location information here.',
          );
        } else {
          const formatted = caseFactsList.map((f, i) => `${i + 1}. ${f.factContent}`).join('\n\n');
          setCaseFacts(`⚖️ Case Facts (${caseFactsList.length})\n\n${formatted}`);
        }
      } catch (error) {
        console.error('Failed to load case facts:', error);
        setUserFacts('❌ Error loading facts\n\nPlease try refreshing.');
        setCaseFacts('❌ Error loading facts\n\nPlease try refreshing.');
      } finally {
        setLoading(false);
      }
    };

    void loadFacts();
  }, [caseId]);

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
            relative group
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

          {/* Note content - READ ONLY */}
          <div className="w-full h-36 text-gray-800 font-['Segoe_Print','Comic_Sans_MS',cursive] text-sm leading-relaxed whitespace-pre-wrap break-words overflow-auto">
            {loading ? '⏳ Loading...' : userFacts}
          </div>

          {/* Note footer with shadow line */}
          <div className="absolute bottom-3 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400/30 to-transparent" />

          {/* AI-controlled badge */}
          <div className="absolute bottom-1 right-3 text-xs text-blue-600/60 font-['Segoe_Print']">
            🤖 AI Memory
          </div>
        </div>

        {/* Case Facts Note - Yellow */}
        <div
          className="
            bg-gradient-to-br from-yellow-200 via-yellow-100 to-yellow-200
            shadow-lg shadow-yellow-400/50
            w-72 min-h-[200px] p-5 rounded-sm
            transform transition-all duration-300 ease-out
            hover:scale-105 hover:rotate-0 hover:shadow-xl
            relative group
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

          {/* Note content - READ ONLY */}
          <div className="w-full h-36 text-gray-800 font-['Segoe_Print','Comic_Sans_MS',cursive] text-sm leading-relaxed whitespace-pre-wrap break-words overflow-auto">
            {loading ? '⏳ Loading...' : caseFacts}
          </div>

          {/* Note footer with shadow line */}
          <div className="absolute bottom-3 left-0 right-0 h-px bg-gradient-to-r from-transparent via-yellow-400/30 to-transparent" />

          {/* AI-controlled badge */}
          <div className="absolute bottom-1 right-3 text-xs text-yellow-600/60 font-['Segoe_Print']">
            🤖 AI Memory
          </div>
        </div>
      </div>
    </div>
  );
}
