export interface FinanceSection { path: string; label: string; icon: string; hint: string; roles?: string[]; }

/** Single source for the finance sub-navigation (sidebar group + tab strip). */
export const FINANCE_SECTIONS: FinanceSection[] = [
  { path: 'overview',     label: 'نظرة عامة',             icon: '📈', hint: 'ملخص الخزينة والمنصرف والوارد حسب البند والسنة' },
  { path: 'journal',      label: 'دفتر اليومية',          icon: '📒', hint: 'كل حركات الوارد والمنصرف' },
  { path: 'shareholders', label: 'المساهمون',             icon: '👥', hint: 'مساهمات الشركاء والأقساط' },
  { path: 'payroll',      label: 'الرواتب والعمالة',       icon: '👷', hint: 'الموظفون والعمال وكشف الرواتب' },
  { path: 'assets',       label: 'الأصول والبنية التحتية', icon: '🏗️', hint: 'تكلفة التأسيس والإهلاك والصيانة' },
  { path: 'activities',   label: 'تقارير الأنشطة',        icon: '🌾', hint: 'إيرادات ومصروفات كل نشاط / محصول' },
  { path: 'settings',     label: 'الإعدادات والقوائم',     icon: '⚙️', hint: 'البنود والأنشطة وطرق الدفع والرصيد الافتتاحي', roles: ['Admin'] },
];
