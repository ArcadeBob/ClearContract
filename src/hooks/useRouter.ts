import { useState, useEffect, useCallback } from 'react';
import { ViewState } from '../types/contract';

interface RouterState {
  view: ViewState;
  contractId: string | null;
}

function parseUrl(pathname: string): RouterState {
  if (pathname === '/upload') {
    return { view: 'upload', contractId: null };
  }
  if (pathname === '/contracts') {
    return { view: 'contracts', contractId: null };
  }
  if (pathname.startsWith('/contracts/')) {
    const id = pathname.slice('/contracts/'.length);
    return { view: 'review', contractId: id };
  }
  if (pathname === '/settings') {
    return { view: 'settings', contractId: null };
  }
  return { view: 'dashboard', contractId: null };
}

export function useRouter() {
  const [state, setState] = useState<RouterState>(() =>
    parseUrl(window.location.pathname)
  );

  useEffect(() => {
    const handlePopState = () => {
      setState(parseUrl(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = useCallback(
    (view: ViewState, contractId?: string) => {
      let newState: RouterState;

      if (view === 'upload') {
        newState = { view: 'upload', contractId: null };
        window.history.pushState(null, '', '/upload');
        setState(newState);
        return;
      }

      if (view === 'review' && contractId) {
        newState = { view: 'review', contractId };
        window.history.pushState(null, '', `/contracts/${contractId}`);
      } else if (view === 'settings') {
        newState = { view: 'settings', contractId: null };
        window.history.pushState(null, '', '/settings');
      } else if (view === 'contracts') {
        newState = { view: 'contracts', contractId: null };
        window.history.pushState(null, '', '/contracts');
      } else {
        newState = { view: 'dashboard', contractId: null };
        window.history.pushState(null, '', '/');
      }

      setState(newState);
    },
    []
  );

  return {
    activeView: state.view,
    activeContractId: state.contractId,
    navigateTo,
  };
}
