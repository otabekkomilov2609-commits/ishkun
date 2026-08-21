import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

// Catches render-time errors from any child subtree and shows a friendly
// fallback instead of a blank white screen. Must live inside <Router> so the
// fallback's "Bosh sahifaga qaytish" link can navigate. Resetting hasError on
// navigation lets the app recover without a full reload.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught an error:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-600 mb-4">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-display font-bold text-foreground">Nimadir noto'g'ri ketdi</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Kechirim so'raymiz, sahifada kutilmagan xatolik yuz berdi. Iltimos, bosh sahifaga qaytib urinib ko'ring.
          </p>
          <Link
            to="/"
            onClick={this.handleReset}
            className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            Bosh sahifaga qaytish
          </Link>
        </div>
      );
    }
    return this.props.children;
  }
}