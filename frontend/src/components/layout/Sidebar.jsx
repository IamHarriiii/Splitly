import { Home, Users, Receipt, Scale, Bot, LogOut, Sparkles } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function Sidebar() {
  const { user, logout } = useAuth();

  const navItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard', color: 'blue' },
    { path: '/groups', icon: Users, label: 'Groups', color: 'emerald' },
    { path: '/expenses', icon: Receipt, label: 'Expenses', color: 'amber' },
    { path: '/settlements', icon: Scale, label: 'Settlements', color: 'violet' },
    { path: '/chatbot', icon: Bot, label: 'AI Assistant', color: 'indigo' },
  ];

  return (
    <div className="w-64 bg-white border-r border-slate-200 h-screen sticky top-0 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-sm">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Splitly
            </h1>
            <p className="text-xs text-slate-500">Expense Splitting</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? `bg-${item.color}-50 text-${item.color}-700 font-medium`
                  : 'text-slate-600 hover:bg-slate-50'
              }`
            }
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-slate-200">
        <div className="mb-3 px-3 py-2 bg-slate-50 rounded-lg">
          <p className="text-sm font-medium text-slate-900 truncate">{user?.name}</p>
          <p className="text-xs text-slate-500 truncate">{user?.email}</p>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 w-full text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut size={20} />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
}
