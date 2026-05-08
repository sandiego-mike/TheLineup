import { Component } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.jsx';
import './styles.css';

class RootErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <main className="loading">
          <div className="startup-help">
            <strong>Lineup Ops hit a startup error.</strong>
            <span>{this.state.error.message}</span>
            <code>Press Cmd+R after saving changes.</code>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}

try {
  createRoot(document.getElementById('root')).render(
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  );
} catch (error) {
  document.getElementById('root').innerHTML = `
    <main style="min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;background:#f3f6f0;color:#17241f">
      <div style="max-width:560px;border:1px solid #dbe4dd;background:white;border-radius:8px;padding:18px;display:grid;gap:10px">
        <strong>Lineup Ops could not start.</strong>
        <span>${error.message}</span>
      </div>
    </main>
  `;
}
