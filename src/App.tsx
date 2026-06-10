import { useEffect } from 'react';
import { Layout } from './components/Layout/Layout';
import { useTheme } from './hooks/useTheme';
import { useDocumentStore } from './stores/documentStore';
import { useAuthStore } from './stores/authStore';

export default function App() {
  useTheme();
  useEffect(() => {
    useDocumentStore.getState().hydrate();
  }, []);
  useEffect(() => useAuthStore.getState().start(), []);
  return <Layout />;
}
