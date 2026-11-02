import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed shadow-sm cursor-pointer';

  const variants = {
    primary: 'bg-[#0e3a78] hover:bg-[#124794] text-white active:bg-[#092652]',
    secondary: 'bg-[#f4f8fd] hover:bg-[#e8f1fc] text-[#0e3a78] border border-[#e2ebf5] hover:border-[#cbdff2]',
    outline: 'border border-[#0e3a78] text-[#0e3a78] hover:bg-[#e8f1fc]/50',
    ghost: 'text-[#0e3a78] hover:bg-[#f4f8fd] shadow-none',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-xl border border-[#e2ebf5] bg-white px-3.5 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#185adb] focus:outline-none focus:ring-2 focus:ring-[#185adb]/20 transition-all ${className}`}
      {...props}
    />
  );
}

export function EmptyState({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-dashed border-[#cbdff2] bg-white/70 p-8 text-center text-slate-500 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function LoadingSpinner({ className = '' }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-2 text-sm text-[#0e3a78] ${className}`}>
      <svg
        className="h-4 w-4 animate-spin text-[#185adb]"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
      <span>Đang tải...</span>
    </div>
  );
}
