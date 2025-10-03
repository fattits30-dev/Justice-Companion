function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary-600 mb-4">
          Justice Companion
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Free Legal Information for UK Citizens
        </p>
        <div className="bg-white rounded-lg shadow-md p-8 max-w-2xl">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            ⚠️ Important Disclaimer
          </h2>
          <p className="text-gray-600 text-left leading-relaxed">
            This application provides <strong>legal INFORMATION</strong>, not legal advice.
            <br /><br />
            • No solicitor-client relationship is created
            <br />
            • Information is general and may not apply to your situation
            <br />
            • Always consult a qualified solicitor for legal advice
            <br />
            • We bear NO liability for legal outcomes
          </p>
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Electron + React + TypeScript + Vite
              <br />
              Development Mode Active ✅
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
