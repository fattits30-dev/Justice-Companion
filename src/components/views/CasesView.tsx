import { Plus, Scale, Search } from 'lucide-react';

export function CasesView(): JSX.Element {
  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Cases</h1>
            <p className="text-blue-200">Organize and track your legal matters</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-500 hover:to-indigo-500 transition-all font-medium shadow-lg">
            <Plus className="w-5 h-5" />
            <span>New Case</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-300" />
            <input
              type="text"
              placeholder="Search cases..."
              className="w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-blue-700/30 rounded-lg text-white placeholder-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Empty State */}
        <div className="bg-gradient-to-br from-slate-900/50 to-blue-950/50 border border-blue-800/30 rounded-xl p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Scale className="w-10 h-10 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">No Cases Yet</h2>
            <p className="text-blue-300 mb-6">
              Create a case to organize legal information, documents, and conversations related to a specific legal matter.
            </p>
            <button className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-500 hover:to-indigo-500 transition-all font-medium shadow-lg">
              <Plus className="w-5 h-5" />
              <span>Create Your First Case</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
