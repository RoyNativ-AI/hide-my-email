import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f0eee6' }}>
      <div className="animate-spin rounded-full h-12 w-12 border-2 border-black/20 border-t-black"></div>
    </div>
  );
};

export default LoadingSpinner;