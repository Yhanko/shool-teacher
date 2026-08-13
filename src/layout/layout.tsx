import { useState } from 'react';
import { Sidebar } from '@/layout/Sidebar';
import { Header } from '@/layout/Header';
import { StudentProvider } from '@/contexts/StudentContext';
import { Outlet } from 'react-router-dom';

export function Layout() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <StudentProvider>
      <div className="flex h-screen w-screen bg-gray-50 overflow-hidden">
        {/* Mobile overlay */}
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-20 md:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        <Sidebar
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            setMobileSidebarOpen(false);
          }}
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
        />

        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Header onMenuToggle={() => setMobileSidebarOpen((v) => !v)} />

          <main className="flex-1 overflow-y-auto p-3 sm:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </StudentProvider>
  );
}