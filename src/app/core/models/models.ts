// All money values are in Egyptian pounds (EGP / ج.م).
// Enums are serialized by the API as strings (JsonStringEnumConverter).

// ── Auth ──────────────────────────────────────────────────────────
export interface LoginRequest { username: string; password: string; }
export interface AuthResponse { accessToken: string; refreshToken: string; }

export interface JwtPayload {
  /** Role / name / id claims may use short names or full .NET claim URIs — read them via AuthService. */
  [claim: string]: unknown;
  FullName: string;
  ShareholderId: string;
  exp: number;
}

// ── API envelope ──────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: Record<string, string[]>;
}

// ── Enums ─────────────────────────────────────────────────────────
export type TransactionType = 'Income' | 'Expense';
export type LookupKind = 'IncomeItem' | 'ExpenseItem' | 'Activity' | 'PaymentMethod';
export type InstallmentStatus = 'Upcoming' | 'Paid' | 'Overdue' | 'PartiallyPaid' | 'Waived';
export type MaintenanceStatus = 'Pending' | 'InProgress' | 'Completed' | 'Cancelled';
export type MaintenancePriority = 'Low' | 'Normal' | 'High' | 'Critical';
export type CropType = 'Alfalfa' | 'SeasonalCrop' | 'Lemon' | 'Mango' | 'SaidiDates' | 'Livestock' | 'FishFarm' | 'MedjoolDates';
export type InfrastructureCategory = 'Well' | 'SolarEnergy' | 'IrrigationNetwork' | 'LandPreparation' | 'Roads'
  | 'Buildings' | 'Equipment' | 'Windbreaks' | 'WaterPond' | 'Electricity';

/** Stable codes of lookup items with business meaning (names are editable). */
export const LOOKUP_CODES = {
  partnerContribution: 'PartnerContribution',
  salaries: 'Salaries',
  generalActivity: 'General',
  payrollActivity: 'Payroll',
} as const;

// ── Journal ───────────────────────────────────────────────────────
export interface JournalEntry {
  id: string;
  sequenceNo: number;
  transactionDate: string;
  type: TransactionType;
  itemId: string;
  itemName: string;
  itemCode?: string | null;
  activityId: string;
  activityName: string;
  description: string;
  amount: number;
  income: number;
  expense: number;
  runningBalance: number;
  shareholderId?: string | null;
  workerId?: string | null;
  partyName?: string | null;
  paymentMethodId?: string | null;
  paymentMethodName?: string | null;
  documentNumber?: string | null;
  notes?: string | null;
  createdAt: string;
  createdBy?: string | null;
  updatedAt?: string | null;
  attachmentCount: number;
  /** Partner contributions only: amount paid in Saudi riyals. */
  amountSar?: number | null;
}

/** Proof document (image / PDF) attached to a journal movement. */
export interface Attachment {
  id: string;
  transactionId?: string | null;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  isImage: boolean;
  createdAt: string;
  createdBy?: string | null;
}

export interface JournalEntryInput {
  transactionDate: string;
  type: TransactionType;
  itemId: string;
  activityId: string;
  description: string;
  amount: number;
  /** Required when the item is «مساهمة شريك»: amount paid in SAR. */
  amountSar?: number | null;
  shareholderId?: string | null;
  workerId?: string | null;
  paymentMethodId?: string | null;
  documentNumber?: string | null;
  notes?: string | null;
  /** Uploaded proof documents to link — required on create when settings.requireAttachments. */
  attachmentIds?: string[];
}

export interface JournalQuery {
  page?: number;
  pageSize?: number;
  from?: string;
  to?: string;
  type?: TransactionType | '';
  itemId?: string;
  activityId?: string;
  shareholderId?: string;
  workerId?: string;
  paymentMethodId?: string;
  search?: string;
  hasAttachments?: boolean;
  sort?: 'asc' | 'desc';
}

export interface JournalQueryResult {
  items: JournalEntry[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  totalIncome: number;
  totalExpense: number;
  currentBalance: number;
}

// ── Summary (الملخص) ──────────────────────────────────────────────
export interface YearAmount { year: number; amount: number; }

export interface FinanceKpis {
  openingBalance: number;
  totalIncome: number;
  totalExpense: number;
  currentBalance: number;
  partnerContributions: number;
  activityRevenue: number;
  movementCount: number;
  lastMovementDate?: string | null;
}

export interface ItemBreakdownRow {
  itemId: string;
  itemName: string;
  byYear: YearAmount[];
  total: number;
  percentage: number;
}

export interface MonthlyRow {
  year: number;
  month: number;
  income: number;
  expense: number;
  net: number;
  closingBalance: number;
}

export interface ActivitySummaryRow {
  activityId: string;
  activityName: string;
  income: number;
  expense: number;
  net: number;
  count: number;
  lastDate?: string | null;
}

export interface FinanceSummary {
  kpis: FinanceKpis;
  years: number[];
  expenseByItem: ItemBreakdownRow[];
  incomeByItem: ItemBreakdownRow[];
  incomeByYear: YearAmount[];
  expenseByYear: YearAmount[];
  monthly: MonthlyRow[];
  activities: ActivitySummaryRow[];
}

// ── Activity report ───────────────────────────────────────────────
export interface AmountShareRow { id: string; name: string; amount: number; percentage: number; }
export interface ActivityYearRow { year: number; income: number; expense: number; net: number; margin: number; }
export interface ActivityMovementRow {
  id: string; date: string; type: TransactionType; itemName: string; description: string;
  income: number; expense: number; cumulativeNet: number;
}
export interface ActivityReport {
  activityId: string;
  activityName: string;
  income: number;
  expense: number;
  net: number;
  margin: number;
  count: number;
  lastDate?: string | null;
  byYear: ActivityYearRow[];
  expenseByItem: AmountShareRow[];
  incomeByItem: AmountShareRow[];
  movements: ActivityMovementRow[];
}

// ── Payroll ───────────────────────────────────────────────────────
export interface PayrollEmployeeRow {
  workerId: string; workerName: string; role: string; isActive: boolean;
  byYear: YearAmount[]; total: number; payments: number; lastPaymentDate?: string | null; percentage: number;
}
export interface PayrollMonthRow { year: number; month: number; total: number; payments: number; }
export interface PayrollPaymentRow {
  transactionId: string; date: string; workerId?: string | null; workerName?: string | null;
  description: string; amount: number; notes?: string | null;
}
export interface PayrollReport {
  total: number;
  employeesPaid: number;
  paymentsCount: number;
  averageMonthly: number;
  lastPaymentDate?: string | null;
  shareOfExpense: number;
  paymentsWithoutWorker: number;
  years: number[];
  employees: PayrollEmployeeRow[];
  months: PayrollMonthRow[];
  payments: PayrollPaymentRow[];
}

// ── Shareholders ──────────────────────────────────────────────────
// Installments, required/paid/remaining/overdue are in Saudi riyals (SAR).
// Contributions are booked in the journal in EGP and carry their SAR amount.
export interface InstallmentPosition {
  id: string;
  installmentNumber: number;
  label: string;
  dueDate?: string | null;
  amount: number;
  allocated: number;
  remaining: number;
  status: InstallmentStatus;
  notes?: string | null;
}

export interface ShareholderPosition {
  id: string;
  nameAr: string;
  nameEn: string;
  ownershipPercentage: number;
  phoneWhatsApp?: string | null;
  email?: string | null;
  isActive: boolean;
  totalRequired: number;
  totalPaid: number;
  balance: number;
  progressPct: number;
  overdueAmount: number;
  contributionsCount: number;
  lastContributionDate?: string | null;
  paidByYear: YearAmount[];
  installments: InstallmentPosition[];
  /** EGP actually received into the treasury. */
  totalPaidEgp: number;
  /** Σ EGP ÷ Σ SAR of the contributions. */
  averageRate?: number | null;
  contributionsWithoutSar: number;
  paidEgpByYear: YearAmount[];
}

export interface ShareholdersOverview {
  totalRequired: number;
  totalPaid: number;
  totalOverdue: number;
  totalBalance: number;
  years: number[];
  shareholders: ShareholderPosition[];
  totalPaidEgp: number;
  averageRate?: number | null;
  contributionsWithoutSar: number;
}

export interface ShareholderInput {
  nameAr: string; nameEn?: string | null; ownershipPercentage: number;
  phoneWhatsApp?: string | null; email?: string | null;
}
export interface InstallmentInput {
  installmentNumber: number; label: string; dueDate?: string | null; amount: number; notes?: string | null;
}
export interface ContributionInput {
  attachmentIds?: string[];
  date: string;
  /** Paid in SAR — counts against the installment schedule. */
  amountSar: number;
  /** Received in EGP — booked in the journal. */
  amount: number;
  description?: string | null; activityId?: string | null;
  paymentMethodId?: string | null; documentNumber?: string | null; notes?: string | null;
}

// ── Workers ───────────────────────────────────────────────────────
export interface Worker {
  id: string;
  nameAr: string;
  nameEn: string;
  role: string;
  monthlySalary?: number | null;
  hireDate?: string | null;
  terminationDate?: string | null;
  isActive: boolean;
  phone?: string | null;
  nationalId?: string | null;
  notes?: string | null;
  totalPaid: number;
  paymentsCount: number;
  lastPaymentDate?: string | null;
  lastPaymentAmount?: number | null;
}
export interface WorkerInput {
  nameAr: string; nameEn?: string | null; role: string; monthlySalary?: number | null;
  hireDate?: string | null; phone?: string | null; nationalId?: string | null; notes?: string | null; isActive: boolean;
}
export interface SalaryPaymentInput {
  attachmentIds?: string[];
  date: string; amount: number; description?: string | null; activityId?: string | null;
  paymentMethodId?: string | null; documentNumber?: string | null; notes?: string | null;
}

// ── Assets ────────────────────────────────────────────────────────
export interface Maintenance {
  id: string; infrastructureItemId: string; itemName: string; title: string; description?: string | null;
  priority: MaintenancePriority; status: MaintenanceStatus; estimatedCost?: number | null; actualCost?: number | null;
  requestDate: string; completionDate?: string | null; assignedTo?: string | null; notes?: string | null;
}
export interface AssetRow {
  id: string;
  category: InfrastructureCategory;
  nameAr: string;
  nameEn: string;
  description?: string | null;
  expenseItemId: string;
  expenseItemName: string;
  totalCost: number;
  costByYear: YearAmount[];
  movementsCount: number;
  firstExpenseDate?: string | null;
  lastExpenseDate?: string | null;
  usefulLifeYears?: number | null;
  annualDepreciation: number;
  accumulatedDepreciation: number;
  netBookValue: number;
  isOperational: boolean;
  location?: string | null;
  specifications?: string | null;
  openMaintenanceCount: number;
}
export interface AssetsOverview {
  totalCost: number;
  totalAccumulatedDepreciation: number;
  totalNetBookValue: number;
  shareOfExpense: number;
  years: number[];
  items: AssetRow[];
  openMaintenance: Maintenance[];
}
export interface AssetDetail { asset: AssetRow; movements: JournalEntry[]; maintenance: Maintenance[]; }
export interface AssetInput {
  category: InfrastructureCategory; nameAr: string; nameEn?: string | null; description?: string | null;
  expenseItemId: string; usefulLifeYears?: number | null; isOperational: boolean;
  location?: string | null; specifications?: string | null;
}
export interface MaintenanceInput {
  title: string; description?: string | null; priority: MaintenancePriority;
  estimatedCost?: number | null; assignedTo?: string | null;
}
export interface MaintenanceUpdateInput {
  status: MaintenanceStatus; actualCost?: number | null; completionDate?: string | null;
  assignedTo?: string | null; notes?: string | null;
}

// ── Lookups & settings ────────────────────────────────────────────
export interface LookupItem {
  id: string; kind: LookupKind; nameAr: string; code?: string | null;
  sortOrder: number; isActive: boolean; isSystem: boolean; usageCount: number;
}
export interface PartyOption { id: string; nameAr: string; isActive: boolean; }
export interface LookupBundle {
  incomeItems: LookupItem[];
  expenseItems: LookupItem[];
  activities: LookupItem[];
  paymentMethods: LookupItem[];
  shareholders: PartyOption[];
  workers: PartyOption[];
}
export interface LookupInput { kind: LookupKind; nameAr: string; sortOrder?: number | null; isActive: boolean; }

export interface FarmSettings {
  projectName: string;
  openingBalance: number;
  ledgerStartDate: string;
  currencyCode: string;
  currencyNameAr: string;
  currencySymbol: string;
  dataSource?: string | null;
  requireAttachments: boolean;
}
export interface FarmSettingsInput { projectName: string; openingBalance: number; ledgerStartDate: string; requireAttachments: boolean; }

// ── Dashboard ─────────────────────────────────────────────────────
/** Amounts in SAR. */
export interface ShareholderMini {
  id: string; nameAr: string; totalRequired: number; totalPaid: number; balance: number; progressPct: number;
}
export interface DashboardData {
  kpis: FinanceKpis;
  selectedYear: number;
  years: number[];
  yearIncome: number;
  yearExpense: number;
  monthly: MonthlyRow[];
  topExpenseItems: AmountShareRow[];
  incomeItems: AmountShareRow[];
  activities: ActivitySummaryRow[];
  shareholders: ShareholderMini[];
  /** SAR */
  totalOverdueInstallments: number;
  recentMovements: JournalEntry[];
}

// ── Agriculture ───────────────────────────────────────────────────
export interface CropSummary {
  id: string; cropType: CropType; nameAr: string; nameEn: string; isActive: boolean; description?: string | null;
  activityId?: string | null; activityName?: string | null;
  revenue: number; cost: number; net: number; cyclesCount: number; activeCyclesCount: number;
}
export interface Harvest {
  id: string; cropCycleId: string; harvestDate: string; quantity: number; unit: string;
  pricePerUnit?: number | null; totalValue?: number | null; buyerName?: string | null; notes?: string | null;
}
export interface CropCycle {
  id: string; cropId: string; cropName: string; cycleName: string; plantingDate: string;
  expectedHarvestDate?: string | null; actualHarvestDate?: string | null; areaFeddan: number; seedCost?: number | null;
  isCompleted: boolean; notes?: string | null; harvests: Harvest[];
}
export interface CropDetail { crop: CropSummary; cycles: CropCycle[]; byYear: ActivityYearRow[]; }
export interface CropCycleInput {
  cycleName: string; plantingDate: string; expectedHarvestDate?: string | null;
  areaFeddan: number; seedCost?: number | null; notes?: string | null;
}
export interface HarvestInput {
  harvestDate: string; quantity: number; unit: string; pricePerUnit?: number | null;
  buyerName?: string | null; notes?: string | null;
}

// ── Arabic labels ─────────────────────────────────────────────────
export const TYPE_LABEL: Record<TransactionType, string> = { Income: 'وارد', Expense: 'منصرف' };

export const INSTALLMENT_STATUS_LABEL: Record<InstallmentStatus, string> = {
  Paid: 'مسدد', PartiallyPaid: 'مسدد جزئياً', Overdue: 'متأخر', Upcoming: 'قادم', Waived: 'غير مستحق',
};
export const INSTALLMENT_STATUS_BADGE: Record<InstallmentStatus, string> = {
  Paid: 'badge-success', PartiallyPaid: 'badge-warning', Overdue: 'badge-danger', Upcoming: 'badge-info', Waived: 'badge-gold',
};

export const MAINTENANCE_STATUS_LABEL: Record<MaintenanceStatus, string> = {
  Pending: 'قيد الانتظار', InProgress: 'جاري التنفيذ', Completed: 'مكتمل', Cancelled: 'ملغي',
};
export const MAINTENANCE_PRIORITY_LABEL: Record<MaintenancePriority, string> = {
  Low: 'منخفضة', Normal: 'عادية', High: 'عالية', Critical: 'حرجة',
};
export const MAINTENANCE_PRIORITY_BADGE: Record<MaintenancePriority, string> = {
  Low: 'badge-info', Normal: 'badge-success', High: 'badge-warning', Critical: 'badge-danger',
};

export const ASSET_CATEGORY_LABEL: Record<InfrastructureCategory, string> = {
  Well: 'البئر', SolarEnergy: 'الطاقة الشمسية', IrrigationNetwork: 'شبكة الري', LandPreparation: 'تجهيز الأرض',
  Roads: 'الطرق', Buildings: 'الإنشاءات', Equipment: 'المعدات', Windbreaks: 'مصدات الرياح',
  WaterPond: 'بركة المياه', Electricity: 'الكهرباء',
};
export const ASSET_CATEGORY_ICON: Record<InfrastructureCategory, string> = {
  Well: '💧', SolarEnergy: '☀️', IrrigationNetwork: '🌊', LandPreparation: '🚜', Roads: '🛣️',
  Buildings: '🏠', Equipment: '⚙️', Windbreaks: '🌬️', WaterPond: '🏞️', Electricity: '⚡',
};

export const LOOKUP_KIND_LABEL: Record<LookupKind, string> = {
  IncomeItem: 'بنود الوارد', ExpenseItem: 'بنود المنصرف', Activity: 'الأنشطة / المحاصيل', PaymentMethod: 'طرق الدفع',
};

export const CROP_ICON: Record<CropType, string> = {
  Alfalfa: '🌿', SeasonalCrop: '🌾', Lemon: '🍋', Mango: '🥭', SaidiDates: '🌴',
  Livestock: '🐄', FishFarm: '🐟', MedjoolDates: '🌴',
};
export const CROP_COLOR: Record<CropType, string> = {
  Alfalfa: '#4caf50', SeasonalCrop: '#c8a84b', Lemon: '#ffeb3b', Mango: '#ff9800',
  SaidiDates: '#8d6e63', Livestock: '#9e9e9e', FishFarm: '#03a9f4', MedjoolDates: '#a1887f',
};
