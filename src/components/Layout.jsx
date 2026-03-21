import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Monitor, Users, CreditCard, DoorOpen,
  ScrollText, Rocket, CalendarDays, Search, Settings,
  LogOut, Menu, X, ChevronRight, Activity, Shield
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Дашборд' },
  { to: '/devices', icon: Monitor, label: 'Устройства' },
  { to: '/persons', icon: Users, label: 'Персоны' },
  { to: '/credentials', icon: CreditCard, label: 'Доступы' },
  { to: '/doors', icon: DoorOpen, label: 'Двери' },
  { to: '/events', icon: ScrollText, label: 'События' },
  { to: '/deployments', icon: Rocket, label: 'Деплой' },
  { to: '/policies', icon: CalendarDays, label: 'Политики' },
  { to: '/audit', icon: Search, label: 'Аудит' },
  { to: '/device-mgmt', icon: Settings, label: 'Управление' },
];

export default function Layout({ children }) {
  const { onLogout, baseUrl } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-[#0f1117] overflow-hidden">
      {/* Sidebar */}
      <aside className={`flex flex-col bg-white/5 backdrop-blur-xl border-r border-white/10 transition-all duration-300 flex-shrink-0 ${collapsed ? 'w-16' : 'w-56'}`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-500/30">
            <Shield className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-white font-semibold text-sm truncate">ACS Platform</p>
              <p className="text-slate-500 text-xs truncate">{baseUrl?.replace('https://', '')}</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-0.5 px-2 overflow-y-auto scrollbar-thin">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group relative ${
                  isActive
                    ? 'bg-violet-500/20 text-violet-300'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-violet-400 rounded-r-full" />
                  )}
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-violet-400' : ''}`} />
                  {!collapsed && <span className="text-sm font-medium">{label}</span>}
                  {!collapsed && isActive && <ChevronRight className="w-3 h-3 ml-auto text-violet-400" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-2 border-t border-white/10 space-y-0.5">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-all"
          >
            {collapsed ? <Menu className="w-4 h-4" /> : <><X className="w-4 h-4" />{!collapsed && <span className="text-sm">Свернуть</span>}</>}
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span className="text-sm">Выйти</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center gap-4 px-6 py-4 border-b border-white/10 bg-white/3 backdrop-blur-xl flex-shrink-0">
          <Activity className="w-4 h-4 text-green-400" />
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-slate-400">Подключено к {baseUrl}</span>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
