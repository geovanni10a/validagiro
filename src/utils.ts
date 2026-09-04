import type { ExpiryLevel, UnitOfMeasure } from './types';

const DAY_MS = 86_400_000;

export function todayIso() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function parseDateInput(value: string): string | null {
  const clean = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const date = new Date(`${clean}T12:00:00`);
    return Number.isNaN(date.getTime()) ? null : clean;
  }
  const match = clean.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  const iso = `${year}-${month}-${day}`;
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime()) || date.getDate() !== Number(day) || date.getMonth() + 1 !== Number(month)) return null;
  return iso;
}

export function formatDate(iso?: string | null) {
  if (!iso) return 'Não informada';
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`));
}

export function formatMoney(value?: number | null) {
  if (value == null) return 'Não informado';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function parseMoney(value: string) {
  const normalized = value.replace(/\s/g, '').replace(/R\$/i, '').replace(/\./g, '').replace(',', '.');
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

export function daysUntil(iso: string) {
  const target = new Date(`${iso}T12:00:00`).getTime();
  const today = new Date(`${todayIso()}T12:00:00`).getTime();
  return Math.ceil((target - today) / DAY_MS);
}

export function expiryLevel(iso: string): ExpiryLevel {
  const days = daysUntil(iso);
  if (days < 0) return 'EXPIRED';
  if (days <= 14) return 'CRITICAL';
  if (days <= 30) return 'URGENT';
  if (days <= 60) return 'ATTENTION';
  return 'LONG';
}

export const expiryMeta: Record<ExpiryLevel, { label: string; short: string; color: string; background: string }> = {
  LONG: { label: 'Longo prazo', short: '+60 dias', color: '#177245', background: '#EAF8F0' },
  ATTENTION: { label: 'Atenção', short: '31 a 60 dias', color: '#8A4B08', background: '#FFF4DE' },
  URGENT: { label: 'Urgente', short: '15 a 30 dias', color: '#C75B00', background: '#FFF0E5' },
  CRITICAL: { label: 'Crítico', short: '0 a 14 dias', color: '#B42318', background: '#FDECEC' },
  EXPIRED: { label: 'Vencido', short: 'retirar do giro', color: '#7A1020', background: '#F9DCE2' },
};

export function unitLabel(unit: UnitOfMeasure) {
  return unit === 'KG' ? 'Quilograma' : unit === 'L' ? 'Litro' : 'Unidade';
}

export function sanitizeBarcode(value: string) {
  return value.replace(/\D/g, '').slice(0, 20);
}

export function isSupportedBarcode(value: string) {
  return /^\d{8,14}$/.test(value);
}
