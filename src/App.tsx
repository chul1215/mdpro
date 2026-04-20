import { useEffect } from 'react';
import { Layout } from './components/Layout/Layout';
import { useTheme } from './hooks/useTheme';
import { useDocumentStore } from './stores/documentStore';

export default function App() {
  useTheme();
  useEffect(() => {
    useDocumentStore.getState().hydrate();
  }, []);
  return <Layout />;
}
