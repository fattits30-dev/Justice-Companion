/**
 * SourceCitation Component
 *
 * Displays legal sources (legislation, case law) with clickable links.
 * Collapsible to save space when not needed.
 */

import { useState } from 'react';
import { BiChevronDown, BiChevronUp, BiLink } from 'react-icons/bi';

interface SourceCitationProps {
  sources: string[];
}

export function SourceCitation({ sources }: SourceCitationProps): JSX.Element | null {
  const [isExpanded, setIsExpanded] = useState(false);

  if (sources.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 border-t border-gray-200 pt-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
      >
        {isExpanded ? <BiChevronUp className="w-4 h-4" /> : <BiChevronDown className="w-4 h-4" />}
        <span>Sources ({sources.length})</span>
      </button>

      {isExpanded && (
        <ul className="mt-2 space-y-2">
          {sources.map((source, index) => {
            // Parse source string (format: "Title - URL" or just "URL")
            const parts = source.split(' - ');
            const url = parts.length > 1 ? parts[parts.length - 1] : source;
            const title = parts.length > 1 ? parts.slice(0, -1).join(' - ') : source;

            return (
              <li key={index} className="flex items-start gap-2 text-sm">
                <BiLink className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 hover:underline break-all"
                >
                  {title}
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
