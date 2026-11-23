import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.js';
import {
  Compass,
  Sparkles,
  CalendarCheck,
  ClipboardList,
  BarChart3,
  LogOut,
  Users,
  ChevronDown,
  Layers,
  FlaskConical,
  ShieldCheck,
  GraduationCap,
  Building,
} from 'lucide-react';

export const Layout: React.FC = () => {
  const { user, demoUsers, switchPersona, logout } = useAuth();
  const navigate = useNavigate();
  const [personaOpen, setPersonaOpen] = useState(false);

  const handlePersonaSwitch = async (targetUser: any) => {
    await switchPersona(targetUser);
    setPersonaOpen(false);
    if (targetUser.role === 'student') navigate('/discover');
    else if (targetUser.role === 'faculty') navigate('/review');
    else if (targetUser.role === 'admin') navigate('/admin');
  };

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
      isActive
        ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/20'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
    }`;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
      {/* Accessibility Skip Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-brand-600 focus:text-white focus:rounded-md font-medium"
      >
        Skip to main content
      </a>

      {/* Top Navbar */}
      <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-40 px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-brand-500/30 group-hover:scale-105 transition-transform">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-slate-900">
                Lab<span className="text-brand-600">Link</span>
              </span>
              <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-2 px-1.5 py-0.5 bg-slate-100 rounded">
                Campus Core
              </span>
            </div>
          </Link>
        </div>

        {/* Right actions: Demo Persona Switcher & User Profile */}
        <div className="flex items-center gap-3">
          {/* Quick Demo Persona Switcher */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setPersonaOpen(!personaOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 transition-colors shadow-2xs"
            >
              <Users className="w-3.5 h-3.5 text-brand-600" />
              <span className="font-semibold text-slate-900 truncate max-w-[120px] sm:max-w-none">
                {user?.name || 'Switch Role'}
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                {user?.role}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {personaOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                    Instant Persona Switcher
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Switch roles instantly to test competing requests & reviews.
                  </p>
                </div>
                <div className="mt-1 space-y-1 max-h-80 overflow-y-auto">
                  {demoUsers.map(dUser => {
                    const isCurrent = dUser.id === user?.id;
                    return (
                      <button
                        key={dUser.id}
                        type="button"
                        onClick={() => handlePersonaSwitch(dUser)}
                        className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                          isCurrent
                            ? 'bg-brand-50 border border-brand-200 text-brand-900 font-bold'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div>
                          <div className="font-bold flex items-center gap-1.5">
                            {dUser.role === 'admin' ? (
                              <ShieldCheck className="w-3.5 h-3.5 text-rose-600" />
                            ) : dUser.role === 'faculty' ? (
                              <Building className="w-3.5 h-3.5 text-indigo-600" />
                            ) : (
                              <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                            )}
                            {dUser.name}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {dUser.department_code || 'General'} • {dUser.email}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {dUser.role}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Logout */}
          <button
            type="button"
            onClick={logout}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main App Body */}
      <div className="flex-1 flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col justify-between p-4 sticky top-16 h-[calc(100vh-4rem)]">
          <div className="space-y-6">
            {/* Student Navigation */}
            <div>
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Discovery & Booking
              </p>
              <nav className="space-y-1">
                <NavLink to="/discover" className={navItemClass}>
                  <Compass className="w-4 h-4" />
                  Explore Catalog
                </NavLink>
                <NavLink to="/assistant" className={navItemClass}>
                  <Sparkles className="w-4 h-4 text-brand-500" />
                  AI Project Assistant
                </NavLink>
                <NavLink to="/requests" className={navItemClass}>
                  <CalendarCheck className="w-4 h-4" />
                  My Reservations
                </NavLink>
              </nav>
            </div>

            {/* Faculty Section */}
            {(user?.role === 'faculty' || user?.role === 'admin') && (
              <div>
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Faculty Approvals
                </p>
                <nav className="space-y-1">
                  <NavLink to="/review" className={navItemClass}>
                    <ClipboardList className="w-4 h-4 text-indigo-500" />
                    Review Queue
                  </NavLink>
                </nav>
              </div>
            )}

            {/* Admin Section */}
            {user?.role === 'admin' && (
              <div>
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Administration
                </p>
                <nav className="space-y-1">
                  <NavLink to="/admin" className={navItemClass}>
                    <BarChart3 className="w-4 h-4 text-emerald-500" />
                    Utilisation & Equipment
                  </NavLink>
                </nav>
              </div>
            )}
          </div>

          {/* User footer card */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="text-xs font-bold text-slate-900 truncate">{user?.name}</div>
            <div className="text-[11px] text-slate-500 truncate">{user?.email}</div>
            <div className="mt-2 text-[10px] font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200 inline-block">
              {user?.department_name || 'Campus Wide'}
            </div>
          </div>
        </aside>

        {/* Dynamic Content */}
        <main id="main-content" className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
