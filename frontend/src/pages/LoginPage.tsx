import React from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/api';
import toast from 'react-hot-toast';
import { Shield, Mail, Lock, Smartphone } from 'lucide-react';

const LoginPage: React.FC = () => {
  const { login } = useAuth();

  const handleGoogleLogin = async (credentialResponse: CredentialResponse) => {
    try {
      console.log('Google login started, credential received:', !!credentialResponse.credential);
      
      if (!credentialResponse.credential) {
        throw new Error('No credential received');
      }

      console.log('Calling authApi.loginWithGoogle...');
      const response = await authApi.loginWithGoogle(credentialResponse.credential);
      console.log('Login response received:', response);
      
      await login(response.token);
      toast.success('Successfully logged in!');
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login failed. Please try again.');
    }
  };

  const handleDemoLogin = async () => {
    try {
      console.log('Demo login started...');
      const response = await authApi.loginDemo();
      console.log('Demo login response received:', response);
      
      await login(response.token);
      toast.success('Demo login successful!');
    } catch (error) {
      console.error('Demo login error:', error);
      toast.error('Demo login failed');
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="flex-1 bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center p-8">
        <div className="max-w-md text-center lg:text-left text-white">
          <div className="flex justify-center lg:justify-start mb-6">
            <Shield className="h-16 w-16" />
          </div>
          <h1 className="text-4xl font-bold mb-4">Hide My Email</h1>
          <p className="text-xl mb-8 text-primary-100">
            Protect your privacy with disposable email aliases that forward to your Gmail
          </p>
          
          <div className="space-y-4 text-left">
            <div className="flex items-center space-x-3">
              <Mail className="h-5 w-5 text-primary-200" />
              <span>Generate unlimited email aliases</span>
            </div>
            <div className="flex items-center space-x-3">
              <Lock className="h-5 w-5 text-primary-200" />
              <span>Keep your real email private</span>
            </div>
            <div className="flex items-center space-x-3">
              <Smartphone className="h-5 w-5 text-primary-200" />
              <span>Works on mobile and desktop</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="card">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Sign in with Google
              </h2>
              <p className="text-gray-600">
                Connect your Gmail account to start creating aliases
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={handleDemoLogin}
                className="w-full btn btn-primary flex items-center justify-center space-x-2"
              >
                <span>🎮</span>
                <span>כניסה לדמו</span>
              </button>
              
              <div className="text-center text-sm text-gray-500">
                <p>Google OAuth is temporarily disabled</p>
              </div>
            </div>

            <div className="mt-8 text-center text-sm text-gray-500">
              <p>
                By signing in, you agree to our{' '}
                <a href="#" className="text-primary-600 hover:text-primary-500">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="text-primary-600 hover:text-primary-500">
                  Privacy Policy
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;