import React from 'react';
import { clsx } from 'clsx';

// ─── Button ──────────────────────────────────────────────────────
export function Button({
  variant = 'primary',
  size = 'md',
  children,
  className,
  disabled,
  ...props
}) {
  const sizes = {
    sm: 'h-8 px-3 text-[13px]',
    md: 'h-[38px] px-4 text-[14px]',
    lg: 'h-11 px-6 text-[15px]',
  };

  const variants = {
    primary: 'bg-accent text-white hover:brightness-110',
    accent: 'bg-accent text-white hover:brightness-110 shadow-lg shadow-accent/20',
    secondary: 'bg-bg-elevated border border-border-default text-text-primary hover:bg-bg-elevated hover:border-border-strong',
    ghost: 'bg-transparent text-text-secondary hover:bg-bg-elevated hover:text-text-primary',
    danger: 'bg-danger-subtle text-danger hover:bg-danger-subtle border border-border-default',
    success: 'bg-success-subtle text-success border border-border-default',
  };

  return (
    <button
      disabled={disabled}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-ui font-medium',
        'transition-all duration-150 cursor-pointer',
        'active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100',
        sizes[size],
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// ─── Badge ────────────────────────────────────────────────────────
export function Badge({ variant = 'neutral', children, className }) {
  const variants = {
    pending: 'bg-bg-elevated text-text-secondary',
    completed: 'bg-success-subtle text-success',
    delayed: 'bg-danger-subtle text-danger',
    healed: 'bg-accent-subtle text-accent',
    high: 'bg-danger-subtle text-danger',
    medium: 'bg-warning-subtle text-warning',
    low: 'bg-bg-elevated text-text-tertiary',
    neutral: 'bg-bg-elevated text-text-secondary',
    info: 'bg-info-subtle text-info',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded-[6px]',
        'font-mono text-[11px] uppercase tracking-[0.06em]',
        variants[variant] || variants.neutral,
        className
      )}
    >
      {children}
    </span>
  );
}

// ─── Input ────────────────────────────────────────────────────────
export function Input({ className, ...props }) {
  return (
    <input
      className={clsx(
        'h-[38px] w-full rounded-lg px-3',
        'bg-bg-elevated border border-border-default',
        'text-text-primary text-[14px] font-ui',
        'placeholder:text-text-tertiary',
        'focus:border-accent focus:shadow-[0_0_0_3px_rgba(37,99,235,0.15)]',
        'outline-none transition-all duration-150',
        className
      )}
      {...props}
    />
  );
}

// ─── Textarea ────────────────────────────────────────────────────
export function Textarea({ className, ...props }) {
  return (
    <textarea
      className={clsx(
        'w-full rounded-lg px-3 py-2.5',
        'bg-transparent border-0',
        'text-text-primary text-[15px] font-ui leading-relaxed',
        'placeholder:text-text-tertiary placeholder:italic',
        'focus:outline-none resize-none',
        className
      )}
      {...props}
    />
  );
}

// ─── Skeleton ────────────────────────────────────────────────────
export function Skeleton({ className }) {
  return (
    <div
      className={clsx(
        'skeleton rounded-md',
        className
      )}
    />
  );
}

// ─── Empty State ─────────────────────────────────────────────────
export function EmptyState({ icon: Icon, heading, subtext, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      {Icon && <Icon className="w-8 h-8 text-text-tertiary mb-3" strokeWidth={1.5} />}
      {heading && (
        <p className="text-[15px] font-ui text-text-secondary mb-1">{heading}</p>
      )}
      {subtext && (
        <p className="text-[13px] font-ui text-text-tertiary">{subtext}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ─── Divider ─────────────────────────────────────────────────────
export function Divider({ label }) {
  if (!label) {
    return <div className="h-px bg-border-subtle my-4" />;
  }
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-border-subtle" />
      <span className="text-[11px] font-mono text-text-tertiary uppercase tracking-[0.08em] bg-bg-base px-2">
        {label}
      </span>
      <div className="flex-1 h-px bg-border-subtle" />
    </div>
  );
}

// ─── Tooltip ─────────────────────────────────────────────────────
export function Tooltip({ content, children }) {
  return (
    <div className="relative group/tooltip inline-block">
      {children}
      <div className={clsx(
        'absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1.5',
        'glass-sm px-3 py-1.5 text-[12px] font-ui text-text-primary',
        'whitespace-nowrap pointer-events-none',
        'opacity-0 group-hover/tooltip:opacity-100',
        'transition-opacity delay-[400ms] duration-150'
      )}>
        {content}
      </div>
    </div>
  );
}
