import React from 'react';
import { SignInButton } from '@clerk/clerk-react';
import { Shield, Mail, Lock, Zap, Check } from 'lucide-react';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f0eee6' }}>
      {/* Header */}
      <header className="border-b border-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Shield className="h-7 w-7" strokeWidth={1.5} style={{ color: '#d97757' }} />
              <h1 className="text-xl font-medium text-black">Hide My Email</h1>
            </div>
            <SignInButton mode="modal">
              <button className="btn btn-primary">
                Sign In
              </button>
            </SignInButton>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-20 sm:py-32 text-center">
          <div className="mb-8">
            <Shield className="h-20 w-20 mx-auto mb-6" strokeWidth={1} style={{ color: '#d97757' }} />
          </div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-light text-black mb-6">
            Protect Your Email
          </h2>
          <p className="text-xl sm:text-2xl text-black/70 font-light max-w-3xl mx-auto mb-12">
            Create unlimited disposable email addresses that forward to your real inbox
          </p>
          <SignInButton mode="modal">
            <button className="btn btn-primary text-lg px-8 py-4">
              Get Started
            </button>
          </SignInButton>
        </div>

        {/* Features Grid */}
        <div className="py-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          <div className="card text-center">
            <div className="mb-4 flex justify-center">
              <Mail className="h-12 w-12" strokeWidth={1.5} style={{ color: '#d97757' }} />
            </div>
            <h3 className="text-xl font-medium text-black mb-3">
              Instant Aliases
            </h3>
            <p className="text-black/70 font-light">
              Generate email aliases in seconds. No setup required.
            </p>
          </div>

          <div className="card-variant-1 text-center">
            <div className="mb-4 flex justify-center">
              <Lock className="h-12 w-12" strokeWidth={1.5} style={{ color: '#000' }} />
            </div>
            <h3 className="text-xl font-medium text-black mb-3">
              Stay Anonymous
            </h3>
            <p className="text-black/70 font-light">
              Keep your real email address private from websites and services.
            </p>
          </div>

          <div className="card-variant-2 text-center">
            <div className="mb-4 flex justify-center">
              <Zap className="h-12 w-12" strokeWidth={1.5} style={{ color: '#000' }} />
            </div>
            <h3 className="text-xl font-medium text-black mb-3">
              Zero Maintenance
            </h3>
            <p className="text-black/70 font-light">
              All emails forward automatically. Disable any alias anytime.
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="py-16 max-w-4xl mx-auto">
          <h3 className="text-3xl font-light text-black mb-12 text-center">
            How It Works
          </h3>
          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full border border-black flex items-center justify-center bg-white/60">
                  <span className="font-medium text-black">1</span>
                </div>
              </div>
              <div>
                <h4 className="text-lg font-medium text-black mb-1">Create an Alias</h4>
                <p className="text-black/70 font-light">
                  Click a button and get a unique email address instantly
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full border border-black flex items-center justify-center" style={{ backgroundColor: '#e3dacc' }}>
                  <span className="font-medium text-black">2</span>
                </div>
              </div>
              <div>
                <h4 className="text-lg font-medium text-black mb-1">Use It Anywhere</h4>
                <p className="text-black/70 font-light">
                  Sign up for services, newsletters, or websites with your alias
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full border border-black flex items-center justify-center" style={{ backgroundColor: '#bcd1ca' }}>
                  <span className="font-medium text-black">3</span>
                </div>
              </div>
              <div>
                <h4 className="text-lg font-medium text-black mb-1">Receive in Your Inbox</h4>
                <p className="text-black/70 font-light">
                  All emails forward to your real address automatically
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full border border-black flex items-center justify-center" style={{ backgroundColor: '#cbcadc' }}>
                  <span className="font-medium text-black">4</span>
                </div>
              </div>
              <div>
                <h4 className="text-lg font-medium text-black mb-1">Disable Anytime</h4>
                <p className="text-black/70 font-light">
                  Stop spam instantly by turning off any alias
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="py-16 max-w-4xl mx-auto">
          <div className="card-variant-3">
            <h3 className="text-2xl font-light text-black mb-8 text-center">
              Why Use Hide My Email?
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <Check className="h-5 w-5 flex-shrink-0" strokeWidth={2} style={{ color: '#d97757' }} />
                <span className="text-black/80 font-light">Unlimited email aliases</span>
              </div>
              <div className="flex items-center space-x-3">
                <Check className="h-5 w-5 flex-shrink-0" strokeWidth={2} style={{ color: '#d97757' }} />
                <span className="text-black/80 font-light">Instant email forwarding</span>
              </div>
              <div className="flex items-center space-x-3">
                <Check className="h-5 w-5 flex-shrink-0" strokeWidth={2} style={{ color: '#d97757' }} />
                <span className="text-black/80 font-light">No spam in your inbox</span>
              </div>
              <div className="flex items-center space-x-3">
                <Check className="h-5 w-5 flex-shrink-0" strokeWidth={2} style={{ color: '#d97757' }} />
                <span className="text-black/80 font-light">Complete privacy control</span>
              </div>
              <div className="flex items-center space-x-3">
                <Check className="h-5 w-5 flex-shrink-0" strokeWidth={2} style={{ color: '#d97757' }} />
                <span className="text-black/80 font-light">Easy to manage</span>
              </div>
              <div className="flex items-center space-x-3">
                <Check className="h-5 w-5 flex-shrink-0" strokeWidth={2} style={{ color: '#d97757' }} />
                <span className="text-black/80 font-light">Free to use</span>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="py-20 text-center">
          <h3 className="text-3xl font-light text-black mb-6">
            Ready to protect your email?
          </h3>
          <SignInButton mode="modal">
            <button className="btn btn-primary text-lg px-8 py-4">
              Create Your First Alias
            </button>
          </SignInButton>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-black py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-black/50 font-light">
            Hide My Email - Protect your privacy, one email at a time
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
