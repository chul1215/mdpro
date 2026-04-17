import { Layout } from './components/Layout/Layout';
import { useTheme } from './hooks/useTheme';

export default function App() {
  useTheme();
  return <Layout />;
}
