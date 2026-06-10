import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, MapPin, Sprout, MessageCircle,
  TrendingUp, User, LogOut, Menu, X, Leaf
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import SubscriptionBanner from './SubscriptionBanner';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/farms', icon: MapPin, label: 'My Farms' },
  { to: '/crops', icon: Sprout, label: 'Crops' },
  { to: '/advisor', icon: MessageCircle, label: 'AI Advisor' },
  { to: '/market', icon: TrendingUp, label: 'Market' },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <SubscriptionBanner />

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-row flex-1">
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col min-h-screen sticky top-0 h-screen">
          {/* Logo */}
          <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-100">
            <div className="w-8 h-8 rounded-lg bg-leaf-600 flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-gray-900">Bhoomi.Agri</span>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-4 py-4 space-y-1">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? 'bg-leaf-50 text-leaf-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {label}
              </NavLink>
            ))}
          </nav>

          {/* User */}
          <div className="px-4 py-4 border-t border-gray-100">
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition mb-1 ${
                  isActive ? 'bg-leaf-50 text-leaf-700' : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              <User className="w-5 h-5" />
              {user?.name ?? 'Profile'}
            </NavLink>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition"
            >
              <LogOut className="w-5 h-5" />
              Sign out
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile layout */}
      <div className="md:hidden flex flex-col flex-1">
        {/* Mobile header */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-leaf-600 flex items-center justify-center">
              <Leaf className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900">Bhoomi.Agri</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </header>

        {/* Mobile slide-out menu */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setMobileMenuOpen(false)}>
            <div
              className="absolute top-0 right-0 w-72 h-full bg-white shadow-xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <span className="font-semibold text-gray-900">{user?.name}</span>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <nav className="flex-1 px-4 py-4 space-y-1">
                {navItems.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition ${
                        isActive ? 'bg-leaf-50 text-leaf-700' : 'text-gray-600'
                      }`
                    }
                  >
                    <Icon className="w-5 h-5" />
                    {label}
                  </NavLink>
                ))}
                <NavLink
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition ${
                      isActive ? 'bg-leaf-50 text-leaf-700' : 'text-gray-600'
                    }`
                  }
                >
                  <User className="w-5 h-5" />Profile
                </NavLink>
              </nav>
              <div className="px-4 pb-6">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition"
                >
                  <LogOut className="w-5 h-5" />Sign out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile content */}
        <main className="flex-1 overflow-auto pb-20">
          <div className="px-4 py-4">
            <Outlet />
          </div>
        </main>

        {/* Mobile bottom tab bar */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-30 safe-bottom">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition ${
                  isActive ? 'text-leaf-600' : 'text-gray-500'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px]">{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
