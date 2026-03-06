import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { SignedIn, SignedOut, useUser, useAuth as useClerkAuth } from '@clerk/clerk-react';
import DashboardPage from './pages/DashboardPage';
import LandingPage from './pages/LandingPage';
import LoadingSpinner from './components/LoadingSpinner';
import { setClerkGetToken } from './services/api';

const AppContent: React.FC = () => {
  const { isLoaded } = useUser();
  const { getToken } = useClerkAuth();

  useEffect(() => {
    setClerkGetToken(getToken);
  }, [getToken]);

  if (!isLoaded) {
    return <LoadingSpinner />;
  }

  return (
    <Routes>
      <Route
        path="/*"
        element={
          <>
            <SignedIn>
              <DashboardPage />
            </SignedIn>
            <SignedOut>
              <LandingPage />
            </SignedOut>
          </>
        }
      />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen" style={{ backgroundColor: '#f0eee6' }}>
        <AppContent />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#fff',
              color: '#000',
              border: '1px solid #000',
              borderRadius: '12px',
              boxShadow: 'none',
              fontWeight: '300',
            },
          }}
        />
      </div>
    </Router>
  );
};

export default App;