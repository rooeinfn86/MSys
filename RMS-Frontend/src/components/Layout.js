import { memo } from 'react';

const Layout = memo(({ sidebar, topBar, children, isLoading }) => {
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Sidebar */}
      {sidebar}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Top Bar */}
        {topBar}

        {/* Main content area */}
        <div
          className="flex-1 overflow-y-auto bg-black"
          style={{ position: 'relative', height: 'calc(100vh - 64px)' }}
        >
          {children}
        </div>
      </div>
    </div>
  );
});

Layout.displayName = 'Layout';

export default Layout; 