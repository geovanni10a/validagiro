export const colors = {
  brand: '#175CD3',
  brandDark: '#0B3B8C',
  brandSoft: '#EAF2FF',
  background: '#F6F8FB',
  surface: '#FFFFFF',
  text: '#17212B',
  muted: '#596777',
  border: '#D8E0EA',
  success: '#177245',
  successBg: '#EAF8F0',
  warning: '#8A4B08',
  warningBg: '#FFF4DE',
  urgent: '#C75B00',
  urgentBg: '#FFF0E5',
  danger: '#B42318',
  dangerBg: '#FDECEC',
  purple: '#7A2CA7',
  purpleBg: '#F6EAFF',
  overlay: 'rgba(5, 12, 24, 0.72)',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const shadow = {
  shadowColor: '#0B3B8C',
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.08,
  shadowRadius: 10,
  elevation: 2,
};
