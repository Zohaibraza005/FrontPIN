import React from 'react';
import { Link } from 'react-router';
import { Button } from '../components/ui/button';
import { Home } from 'lucide-react';

export const NotFound: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="text-9xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
        404
      </div>
      <h1 className="text-3xl font-bold mb-2">Page Not Found</h1>
      <p className="text-gray-600 mb-8 max-w-md">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/">
        <Button>
          <Home className="mr-2 size-4" />
          Back to Dashboard
        </Button>
      </Link>
    </div>
  );
};
