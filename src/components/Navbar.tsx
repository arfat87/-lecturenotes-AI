import React from 'react';
import { Mic, Search, GraduationCap, Sparkles, Link2 } from 'lucide-react';
import { UserAccount } from '../types';

interface NavbarProps {
  user: UserAccount;
  onOpenRecord: () => void;
  onOpenSearch: () => void;
  onOpenAuth: () => void;
  onOpenAddLink?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onOpenRecord,
  onOpenSearch,
  onOpenAuth,
  onOpenAddLink
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200" role="banner">
      <div className="max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div
          className="flex items-center space-x-2.5 sm:space-x-3 cursor-pointer select-none"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          role="button"
          tabIndex={0}
          aria-label="Go to LectureNotes top"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center shadow-md shadow-indigo-500/20 text-white flex-shrink-0">
            <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight">LectureNotes</span>
              <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                <Sparkles className="w-2.5 h-2.5 mr-0.5 text-indigo-500" /> AI
              </span>
            </div>
            <div className="flex items-center text-[11px] sm:text-xs text-slate-500 space-x-1">
              <GraduationCap className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-indigo-600 flex-shrink-0" />
              <span className="truncate max-w-[120px] sm:max-w-[200px]">{user.college}</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <nav className="flex items-center space-x-2 sm:space-x-3" aria-label="Main Navigation">
          <button
            onClick={onOpenSearch}
            className="flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 transition-colors border border-slate-200/60 min-h-[40px]"
            title="Search notes (Ctrl+K)"
            aria-label="Search notes"
          >
            <Search className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Search...</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white border border-slate-200 rounded text-slate-400">⌘K</kbd>
          </button>

          {onOpenAddLink && (
            <button
              onClick={onOpenAddLink}
              className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 active:scale-95 transition-all min-h-[40px]"
              aria-label="Add from link"
              title="Add lecture or article from URL"
            >
              <Link2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" />
              <span className="hidden sm:inline">Add Link</span>
            </button>
          )}

          <button
            onClick={onOpenRecord}
            className="flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-md shadow-indigo-600/20 transition-all min-h-[40px]"
            aria-label="Record lecture"
          >
            <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Record</span>
            <span className="hidden sm:inline">Lecture</span>
          </button>

          {/* User Avatar */}
          <button
            onClick={onOpenAuth}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-indigo-100 hover:bg-indigo-200 border-2 border-indigo-200 flex items-center justify-center font-bold text-indigo-700 text-xs sm:text-sm transition-colors flex-shrink-0"
            title={`${user.name} (${user.email})`}
            aria-label="Open user profile"
          >
            {user.name.charAt(0).toUpperCase()}
          </button>
        </nav>
      </div>
    </header>
  );
};
