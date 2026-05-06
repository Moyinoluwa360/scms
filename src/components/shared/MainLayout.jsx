import Sidebar from './Sidebar';
import Header from './Header';
import useUIStore from '../../store/uiStore';
import { cn } from '../../lib/utils';

const MainLayout = ({ children, title }) => {
  const { isSidebarOpen } = useUIStore();

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <div className={cn(
        "transition-all duration-300",
        isSidebarOpen ? "lg:pl-64" : "lg:pl-0"
      )}>
        <Header title={title} />
        <main className="p-4 lg:p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
