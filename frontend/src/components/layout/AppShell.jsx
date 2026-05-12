import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import CommandPalette from './CommandPalette';
import AIFloatingPanel from './AIFloatingPanel';
import { TooltipProvider } from '@/components/ui/tooltip';

export default function AppShell() {
  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex min-h-screen w-full">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="relative flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </main>
        </div>
        <CommandPalette />
        <AIFloatingPanel />
      </div>
    </TooltipProvider>
  );
}
