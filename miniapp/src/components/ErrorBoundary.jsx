import { Component } from 'react';
import { hardReload, reloadOnce } from '../lib/recover';

/**
 * Ilovada kutilmagan xato bo'lsa butun ekran oq bo'lib qolmasin:
 * avval bir marta o'zi qayta yuklanadi, bo'lmasa "Qayta yuklash" tugmasi chiqadi.
 */
export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error(error);
    reloadOnce();
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="center" style={{ minHeight: '100vh', padding: 24, textAlign: 'center' }}>
        <img src="/logo.png" alt="ASF GROUP" style={{ width: 80, height: 80, objectFit: 'contain' }} />
        <b>Ilovani yangilash kerak</b>
        <span className="muted">Обновите приложение</span>
        <button
          className="btn"
          style={{ marginTop: 12, maxWidth: 280 }}
          onClick={hardReload}
        >
          Qayta yuklash / Обновить
        </button>
      </div>
    );
  }
}
