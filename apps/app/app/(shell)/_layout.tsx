import { AppShell } from '@/components/app-shell';
import { AppProvider } from '@/providers/app-provider';

export default function ShellLayout() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
