import { StoreProvider } from '../../components/Store';
import Shell from '../../components/Shell';

export default function AppLayout({ children }) {
  return (
    <StoreProvider>
      <Shell>{children}</Shell>
    </StoreProvider>
  );
}
