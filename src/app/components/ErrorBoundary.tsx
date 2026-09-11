import React from 'react';
import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router';
import { Button } from './ui/button';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

export const RouteErrorBoundary: React.FC = () => {
  const error = useRouteError();
  const navigate = useNavigate();

  let errorMessage = 'An unexpected error occurred.';
  let errorDetails = '';

  if (isRouteErrorResponse(error)) {
    errorMessage = `${error.status} ${error.statusText}`;
    errorDetails = error.data?.message || '';
  } else if (error instanceof Error) {
    errorMessage = error.message;
    errorDetails = error.stack || '';
  } else if (typeof error === 'string') {
    errorMessage = error;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 mb-5 shadow-xs">
        <AlertTriangle className="w-8 h-8" />
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
      <p className="text-sm text-gray-600 max-w-md mb-4">
        {errorMessage}
      </p>

      {errorDetails && (
        <details className="w-full max-w-lg mb-6 text-left">
          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 select-none">
            Show technical details
          </summary>
          <pre className="mt-2 p-3 bg-gray-900 text-gray-100 rounded-xl text-xs font-mono overflow-x-auto max-h-48 whitespace-pre-wrap">
            {errorDetails}
          </pre>
        </details>
      )}

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={() => window.location.reload()}
          className="rounded-xl text-xs font-semibold"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
          Reload Page
        </Button>
        <Button
          onClick={() => navigate('/')}
          className="rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Home className="w-3.5 h-3.5 mr-1.5" />
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
};
