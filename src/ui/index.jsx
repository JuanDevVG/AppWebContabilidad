import { Loader2, AlertCircle, CheckCircle2, X } from 'lucide-react';

// ─── Buttons ──────────────────────────────────────────────────────────────────

export function BtnPrimary({ children, loading, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-[7px] bg-[#012d1d] text-white text-[13px] font-semibold rounded-md hover:bg-[#1a3d2d] active:bg-[#011f14] transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap select-none ${className}`}
      disabled={props.disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {children}
    </button>
  );
}

export function BtnSecondary({ children, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-[7px] bg-white text-[#374040] text-[13px] font-semibold rounded-md border border-[#dde8e8] hover:bg-[#f0f5f5] active:bg-[#e6eeee] transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap select-none ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function BtnGhost({ children, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-[7px] text-[#4a6060] text-[13px] font-medium rounded-md hover:bg-[#f0f5f5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function BtnDestructive({ children, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-[7px] text-red-600 text-[13px] font-semibold rounded-md hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function BtnIcon({ children, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`p-1.5 rounded-md text-[#7a9898] hover:text-[#1a2e2e] hover:bg-[#eef3f3] transition-colors disabled:opacity-40 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

// ─── Badges (colores semánticos consistentes en toda la app) ──────────────────
// active   → verde    (estado habilitado, stock ok)
// inactive → gris     (deshabilitado, sin uso)
// warning  → ámbar    (stock bajo, precaución)
// critical → rojo     (stock crítico, error grave) — SOLO para esto
// info     → cielo    (informativo neutro)
// neutral  → teal-100 (etiquetas sin semántica)

const BADGE_CLS = {
  active:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  inactive: 'bg-slate-100 text-slate-500 border-slate-200',
  warning:  'bg-amber-50 text-amber-700 border-amber-200',
  critical: 'bg-red-50 text-red-700 border-red-200',
  info:     'bg-sky-50 text-sky-700 border-sky-200',
  neutral:  'bg-[#eef4f4] text-[#4a6060] border-[#d8e8e8]',
  violet:   'bg-violet-50 text-violet-700 border-violet-200',
  amber:    'bg-amber-50 text-amber-700 border-amber-200',
  sky:      'bg-sky-50 text-sky-700 border-sky-200',
  slate:    'bg-slate-100 text-slate-500 border-slate-200',
  green:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  purple:   'bg-violet-50 text-violet-700 border-violet-200',
};

const DOT_CLS = {
  active:   'bg-emerald-500',
  inactive: 'bg-slate-400',
  warning:  'bg-amber-500',
  critical: 'bg-red-500',
  info:     'bg-sky-500',
};

export function Badge({ variant = 'neutral', dot = false, children }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${BADGE_CLS[variant] ?? BADGE_CLS.neutral}`}>
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${DOT_CLS[variant] ?? 'bg-slate-400'}`} />
      )}
      {children}
    </span>
  );
}

// ─── Inputs / Formulario ──────────────────────────────────────────────────────

export function FieldLabel({ children, required, htmlFor }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-[11px] font-semibold text-[#374040] uppercase tracking-wide mb-1.5"
    >
      {children}
      {required && <span className="text-red-400 ml-0.5 normal-case font-normal"> *</span>}
    </label>
  );
}

const inputBase =
  'w-full px-3 py-[7px] bg-white border rounded-md text-[13px] text-[#1a2e2e] placeholder:text-[#aebfbf] focus:outline-none transition-colors disabled:opacity-50 disabled:bg-[#f5f8f8] disabled:cursor-not-allowed';
const inputNormal =
  'border-[#dde8e8] focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]/10';
const inputError =
  'border-red-400 focus:border-red-400 focus:ring-1 focus:ring-red-300/30';

export function FieldInput({ error, icon, className = '', ...props }) {
  return (
    <div className={icon ? 'relative' : undefined}>
      {icon && (
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#aebfbf] text-[18px] pointer-events-none select-none">
          {icon}
        </span>
      )}
      <input
        className={`${inputBase} ${error ? inputError : inputNormal} ${icon ? 'pl-9' : ''} ${className}`}
        {...props}
      />
    </div>
  );
}

export function FieldSelect({ error, className = '', children, ...props }) {
  return (
    <select
      className={`${inputBase} ${error ? inputError : inputNormal} ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export function FieldTextarea({ error, className = '', ...props }) {
  return (
    <textarea
      className={`${inputBase} ${error ? inputError : inputNormal} resize-none ${className}`}
      {...props}
    />
  );
}

export function FieldError({ children }) {
  if (!children) return null;
  return <p className="mt-1 text-[11px] text-red-500">{children}</p>;
}

export function FieldHint({ children }) {
  if (!children) return null;
  return <p className="mt-1 text-[11px] text-[#aebfbf]">{children}</p>;
}

export function Field({ label, required, error, hint, children }) {
  return (
    <div>
      {label && <FieldLabel required={required}>{label}</FieldLabel>}
      {children}
      {error ? <FieldError>{error}</FieldError> : <FieldHint>{hint}</FieldHint>}
    </div>
  );
}

// ─── Alertas ──────────────────────────────────────────────────────────────────

export function AlertError({ children, onRetry }) {
  return (
    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-[13px] text-red-700 mb-4">
      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-px" />
      <span className="flex-1">{children}</span>
      {onRetry && (
        <button onClick={onRetry} className="text-[12px] font-semibold underline shrink-0 hover:text-red-900">
          Reintentar
        </button>
      )}
    </div>
  );
}

export function AlertSuccess({ children }) {
  return (
    <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-md text-[13px] text-emerald-700 mb-4">
      <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-px" />
      <span>{children}</span>
    </div>
  );
}

// ─── Estructura de página ─────────────────────────────────────────────────────

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div>
        <h2 className="text-[17px] font-semibold text-[#1a2e2e] tracking-tight leading-snug">{title}</h2>
        {subtitle && <p className="text-[13px] text-[#6b8f8f] mt-0.5">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2 flex-shrink-0">{children}</div>}
    </div>
  );
}

export function ContentCard({ children, className = '' }) {
  return (
    <div className={`bg-white border border-[#e4ecec] rounded-lg overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }) {
  return (
    <div className={`px-5 py-3.5 border-b border-[#e4ecec] flex items-center justify-between gap-3 ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children }) {
  return <h3 className="text-[14px] font-semibold text-[#1a2e2e]">{children}</h3>;
}

export function CardFooter({ children }) {
  return (
    <div className="px-4 py-2.5 border-t border-[#f0f5f5] text-[12px] text-[#6b8f8f]">
      {children}
    </div>
  );
}

// ─── Tabla ─────────────────────────────────────────────────────────────────────

export function Th({ children, right = false, center = false, className = '' }) {
  return (
    <th
      className={`px-4 py-2.5 text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wider whitespace-nowrap
        ${right ? 'text-right' : center ? 'text-center' : 'text-left'} ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({ children, right = false, center = false, mono = false, muted = false, className = '' }) {
  return (
    <td
      className={`px-4 py-2.5 text-[13px]
        ${mono ? 'font-mono' : ''}
        ${muted ? 'text-[#6b8f8f]' : 'text-[#1a2e2e]'}
        ${right ? 'text-right' : center ? 'text-center' : ''}
        ${className}`}
    >
      {children}
    </td>
  );
}

export function THead({ children }) {
  return (
    <thead>
      <tr className="bg-[#f5f8f8] border-b border-[#e4ecec]">{children}</tr>
    </thead>
  );
}

export function TBody({ children }) {
  return <tbody className="divide-y divide-[#f0f5f5]">{children}</tbody>;
}

export function EmptyRow({ icon: Icon, title, subtitle, cols = 5 }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-12 text-center">
        {Icon && <Icon className="w-8 h-8 mx-auto mb-2 text-[#c4d4d4]" strokeWidth={1.5} />}
        <p className="text-[13px] font-medium text-[#6b8f8f]">{title}</p>
        {subtitle && <p className="text-[12px] text-[#aebfbf] mt-0.5">{subtitle}</p>}
      </td>
    </tr>
  );
}

// ─── Carga ────────────────────────────────────────────────────────────────────

export function Spinner({ size = 'sm', className = '' }) {
  const s = { xs: 'w-3 h-3', sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6' }[size] ?? 'w-4 h-4';
  return <Loader2 className={`${s} animate-spin ${className}`} />;
}

export function LoadingRows({ cols = 5, rows = 4 }) {
  return [...Array(rows)].map((_, i) => (
    <tr key={i} className="animate-pulse">
      {[...Array(cols)].map((_, j) => (
        <td key={j} className="px-4 py-2.5">
          <div
            className="h-3 bg-[#eef3f3] rounded"
            style={{ width: `${45 + ((i * 31 + j * 19) % 40)}%` }}
          />
        </td>
      ))}
    </tr>
  ));
}

// ─── Drawer (panel deslizante) ────────────────────────────────────────────────

export function Drawer({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/25" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white flex flex-col h-full animate-slide-in border-l border-[#e4ecec]">
        {children}
      </div>
    </div>
  );
}

export function DrawerHeader({ title, subtitle, icon, onClose, disabled }) {
  return (
    <div className="px-5 py-4 border-b border-[#e4ecec] flex items-center justify-between gap-3 flex-shrink-0">
      <div className="flex items-center gap-2.5 min-w-0">
        {icon && (
          <span className="material-symbols-outlined text-[#6b8f8f] text-[20px] flex-shrink-0">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h3 className="text-[14px] font-semibold text-[#1a2e2e] leading-tight">{title}</h3>
          {subtitle && <p className="text-[12px] text-[#6b8f8f] mt-px">{subtitle}</p>}
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        disabled={disabled}
        className="p-1.5 rounded-md text-[#aebfbf] hover:text-[#1a2e2e] hover:bg-[#f0f5f5] transition-colors flex-shrink-0 disabled:opacity-40"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function DrawerBody({ children }) {
  return (
    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 custom-scrollbar">
      {children}
    </div>
  );
}

export function DrawerFooter({ onCancel, onSave, saving, saveLabel = 'Guardar', cancelLabel = 'Cancelar', saveIcon, form }) {
  return (
    <div className="px-5 py-4 border-t border-[#e4ecec] flex gap-2.5 flex-shrink-0">
      <BtnSecondary type="button" onClick={onCancel} disabled={saving} className="flex-1">
        {cancelLabel}
      </BtnSecondary>
      <BtnPrimary
        type={form ? 'submit' : 'button'}
        form={form}
        onClick={!form ? onSave : undefined}
        loading={saving}
        disabled={saving}
        className="flex-1"
      >
        {saveIcon && !saving && (
          <span className="material-symbols-outlined text-[15px]">{saveIcon}</span>
        )}
        {saving ? 'Guardando...' : saveLabel}
      </BtnPrimary>
    </div>
  );
}

// ─── Toggle (switch) ──────────────────────────────────────────────────────────

export function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#012d1d]/20 disabled:opacity-50 ${checked ? 'bg-[#012d1d]' : 'bg-[#dde8e8]'}`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[18px]' : 'translate-x-[3px]'}`}
      />
    </button>
  );
}
