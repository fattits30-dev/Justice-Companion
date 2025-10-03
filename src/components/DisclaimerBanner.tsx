/**
 * DisclaimerBanner Component
 *
 * Fixed banner at the top of the application.
 * Displays legal disclaimer prominently to users.
 */

import { BiError } from 'react-icons/bi';

export function DisclaimerBanner(): JSX.Element {
  return (
    <div className="sticky top-0 z-50 bg-amber-100 border-b-2 border-amber-300 px-4 py-3 shadow-sm">
      <div className="max-w-6xl mx-auto flex items-start gap-3">
        <BiError className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-900">
            <span className="font-bold">Important:</span> This is general legal information only. It is not legal advice.
            Consult a qualified solicitor for advice specific to your situation.
          </p>
        </div>
      </div>
    </div>
  );
}
