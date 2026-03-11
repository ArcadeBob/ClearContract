import {
  LayoutDashboard,
  Upload,
  FileText,
  Settings,
  Gem,
  Sparkles,
} from 'lucide-react';
import { ViewState } from '../types/contract';
interface SidebarProps {
  activeView: ViewState;
  onNavigate: (view: ViewState) => void;
  contractCount: number;
}
export function Sidebar({
  activeView,
  onNavigate,
  contractCount,
}: SidebarProps) {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'upload',
      label: 'Upload & Review',
      icon: Upload,
    },
    {
      id: 'contracts',
      label: 'All Contracts',
      icon: FileText,
      badge: contractCount,
    },
  ];

  return (
    <div className="w-64 bg-slate-900 text-white flex flex-col h-full border-r border-slate-800">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Gem className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Clean Glass</h1>
            <p className="text-xs text-slate-400">Installation Inc.</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id as ViewState)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeView === item.id ? 'bg-blue-600/10 text-blue-400 border-l-2 border-blue-500' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <div className="flex items-center space-x-3">
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </div>
            {item.badge && (
              <span className="bg-slate-800 text-slate-300 text-xs py-0.5 px-2 rounded-full">
                {item.badge}
              </span>
            )}
          </button>
        ))}

        <button
          onClick={() => onNavigate('settings' as ViewState)}
          className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeView === 'settings' ? 'bg-blue-600/10 text-blue-400 border-l-2 border-blue-500' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
        >
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </button>
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-xl p-4 border border-indigo-500/30">
          <div className="flex items-center space-x-2 mb-2 text-indigo-300">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              AI Powered
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Contract analysis engine v2.4 active. Updated with latest California
            labor codes.
          </p>
        </div>
      </div>
    </div>
  );
}
