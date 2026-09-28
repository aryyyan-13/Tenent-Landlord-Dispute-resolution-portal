import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  handleReset = () => {
    localStorage.removeItem('tldrp_token');
    localStorage.removeItem('tldrp_user');
    window.location.href = '/login';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: '#faf9f6',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          <div style={{
            maxWidth: 480,
            width: '100%',
            background: '#ffffff',
            border: '1px solid #c4c6cc',
            borderRadius: 8,
            padding: 32,
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <span className="material-symbols-outlined" style={{ color: '#A23B3B', fontSize: 32 }}>
                error
              </span>
              <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#061624' }}>
                Something went wrong
              </h1>
            </div>
            <p style={{ fontSize: 14, color: '#44474c', lineHeight: 1.6, marginBottom: 16 }}>
              An error occurred while loading this view. This can happen if the backend API connection is interrupted or credentials need to be re-authenticated.
            </p>
            {this.state.error?.message && (
              <pre style={{
                background: '#f4f3f1',
                padding: 12,
                borderRadius: 4,
                fontSize: 12,
                color: '#1a1c1a',
                overflowX: 'auto',
                marginBottom: 20
              }}>
                {this.state.error.message}
              </pre>
            )}
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  background: '#061624',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 6,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer'
                }}
              >
                Reload page
              </button>
              <button
                onClick={this.handleReset}
                style={{
                  padding: '10px 16px',
                  background: 'transparent',
                  color: '#44474c',
                  border: '1px solid #c4c6cc',
                  borderRadius: 6,
                  fontWeight: 500,
                  fontSize: 14,
                  cursor: 'pointer'
                }}
              >
                Reset session
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
