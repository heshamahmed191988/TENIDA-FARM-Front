// ── Auth ──────────────────────────────────────────────────────────
export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  AccessToken: string;
  RefreshToken: string;
  username?: string;
  fullName?: string;
  role?: string;
  shareholderId?: string;
  Success?: boolean;
  Message?: string;
}

export interface JwtPayload {
  sub: string;
  unique_name: string;
  role: string;
  FullName: string;
  ShareholderId: string;
  exp: number;
}

// ── API Response wrapper ──────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  Data: T;
  message?: string;
  errors?: Record<string, string[]>;
  pagination?: Pagination;
  totalCount?: number;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// ── Dashboard ─────────────────────────────────────────────────────
export interface DashboardStats {
  summary: FinancialSummary;
  shareholders: ShareholderKpi[];
  expenseSummary: { category: string; amount: number }[];
  incomeSummary: { source: string; amount: number }[];
  monthlyChart2024: MonthlyChart[];
  monthlyChart2025: MonthlyChart[];
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpense: number;
  currentBalance: number;
  totalOverdueInstallments: number;
  netProfit: number;
}

export interface MonthlyChart {
  month: number;
  monthNameAr: string;
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

export interface ShareholderKpi {
  id: string;
  nameAr: string;
  ownershipPercentage: number;
  totalRequired: number;
  totalPaid: number;
  balance: number;
  paymentProgressPct: number;
}

// ── Transaction ───────────────────────────────────────────────────
export interface Transaction {
  id: string;
  transactionDate: string;
  receiptNumber?: string;
  description: string;
  expenseDescription?: string;
  type: TransactionType;
  totalIncome: number;
  totalExpense: number;
  previousBalance: number;
  runningBalance: number;
  currency: Currency;
  incomeCategory?: IncomeCategory;
  expenseCategory?: ExpenseCategory;
  shareholderId?: string;
  shareholderName?: string;
  createdAt?: string;
  // Income breakdown
  incomeMahmoudRagab?: number;
  incomeMahmoudHussein?: number;
  incomeMohamedNaguib?: number;
  incomeMohamedAbdelHadi?: number;
  incomeAlfalfa?: number;
  incomeSeasonalCrop?: number;
  incomeLemon?: number;
  incomeMango?: number;
  incomeSaidiDates?: number;
  incomeLivestock?: number;
  incomeFishFarm?: number;
  incomeBankOther?: number;
  // Expense breakdown
  expMiscellaneous?: number;
  expLandSearch?: number;
  expCompanySetup?: number;
  expWell?: number;
  expSolarEnergy?: number;
  expIrrigationNetwork?: number;
  expLandPreparation?: number;
  expWindbreaks?: number;
  expRoads?: number;
  expWaterPond?: number;
  expBuildings?: number;
  expEquipment?: number;
  expFertilizers?: number;
  expAlfalfaOps?: number;
  expSeasonalOps?: number;
  expLemonOps?: number;
  expMangoOps?: number;
  expSaidiDatesOps?: number;
  expLivestockOps?: number;
  expFishFarmOps?: number;
  expLandRent?: number;
  expSalaries?: number;
  expBankOther?: number;
}

export interface CreateTransactionRequest {
  transactionDate: string;
  description: string;
  expenseDescription?: string;
  receiptNumber?: string;
  type: number;
  currency: number;
  totalIncome: number;
  totalExpense: number;
  incomeCategory?: number;
  expenseCategory?: number;
  shareholderId?: string;
  incomeMahmoudRagab?: number;
  incomeMahmoudHussein?: number;
  incomeMohamedNaguib?: number;
  incomeMohamedAbdelHadi?: number;
  incomeAlfalfa?: number;
  incomeSeasonalCrop?: number;
  expWell?: number;
  expSolarEnergy?: number;
  expIrrigationNetwork?: number;
  expLandPreparation?: number;
  expRoads?: number;
  expBuildings?: number;
  expEquipment?: number;
  expFertilizers?: number;
  expAlfalfaOps?: number;
  expSeasonalOps?: number;
  expLandRent?: number;
  expSalaries?: number;
  expMiscellaneous?: number;
}

// ── Shareholder ───────────────────────────────────────────────────
export interface Shareholder {
  id: string;
  nameAr: string;
  nameEn: string;
  shareCount: number;
  ownershipPercentage: number;
  totalRequiredSar: number;
  totalPaidSar: number;
  balanceSar: number;
  paymentProgressPct: number;
  overdueCount: number;
  overdueAmountSar: number;
  phoneWhatsApp?: string;
  installments: Installment[];
}

export interface Installment {
  id: string;
  installmentNumber: number;
  dueDate: string;
  scheduledAmountSar: number;
  paidAmountSar: number;
  status: InstallmentStatus;
  paidDate?: string;
  receiptReference?: string;
  remainingAmountSar: number;
}

export interface RecordPaymentRequest {
  amount: number;
  paymentDate?: string;
  receiptReference?: string;
  notes?: string;
}

// ── Crop ──────────────────────────────────────────────────────────
export interface Crop {
  id: string;
  nameAr: string;
  nameEn: string;
  cropType: string;
  isActive: boolean;
  description?: string;
  totalRevenueSar: number;
  totalCostSar: number;
  netProfitSar: number;
  totalCycles: number;
  cycles?: CropCycle[];
}

export interface CropCycle {
  id: string;
  cropId: string;
  cycleName: string;
  plantingDate: string;
  expectedHarvestDate?: string;
  actualHarvestDate?: string;
  areaFeddan: number;
  quantityPlantedKg?: number;
  seedCostSar?: number;
  totalCostSar: number;
  totalRevenueSar: number;
  isCompleted: boolean;
  notes?: string;
  harvests?: Harvest[];
}

export interface Harvest {
  id: string;
  cropCycleId: string;
  harvestDate: string;
  quantityKg: number;
  pricePerKgSar: number;
  totalRevenueSar: number;
  buyerName?: string;
  notes?: string;
}

// ── Infrastructure ────────────────────────────────────────────────
export interface InfrastructureItem {
  id: string;
  nameAr: string;
  nameEn: string;
  category: string;
  description?: string;
  totalCostSar: number;
  annualDepreciationSar?: number;
  usefulLifeYears?: number;
  isOperational: boolean;
  acquisitionDate: string;
  location?: string;
  netBookValueSar: number;
  pendingMaintenanceCount?: number;
  maintenanceRequests?: MaintenanceRequest[];
}

export interface MaintenanceRequest {
  id: string;
  infrastructureItemId: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
  estimatedCostSar?: number;
  actualCostSar?: number;
  requestDate: string;
  completionDate?: string;
  assignedTo?: string;
}

// ── Worker ────────────────────────────────────────────────────────
export interface Worker {
  id: string;
  nameAr: string;
  nameEn: string;
  role: string;
  monthlySalarySar: number;
  hireDate: string;
  terminationDate?: string;
  isActive: boolean;
  phone?: string;
  totalPaidSar?: number;
  salaryHistory?: SalaryPayment[];
}

export interface SalaryPayment {
  id: string;
  workerId: string;
  year: number;
  month: number;
  baseSalarySar: number;
  bonusSar?: number;
  deductionSar?: number;
  netSalarySar: number;
  isPaid: boolean;
  paymentDate?: string;
  workerNameAr?: string;
  workerRole?: string;
}

// ── Enums ─────────────────────────────────────────────────────────
export enum TransactionType { Income = 1, Expense = 2 }
export enum Currency { SAR = 1, EGP = 2 }
export enum InstallmentStatus {
  Upcoming = 'Upcoming',
  Paid = 'Paid',
  Overdue = 'Overdue',
  PartiallyPaid = 'PartiallyPaid'
}

export enum IncomeCategory {
  ShareholderContribution = 1,
  AlfalfaSales = 2,
  SeasonalCropSales = 3,
  LemonSales = 4,
  MangoSales = 5,
  SaidiDatesSales = 6,
  LivestockSales = 7,
  FishFarmSales = 8,
  BankOrOtherIncome = 9
}

export enum ExpenseCategory {
  Miscellaneous = 1,
  LandSearch = 2,
  CompanySetup = 3,
  Well = 4,
  SolarEnergy = 5,
  IrrigationNetwork = 6,
  LandPreparation = 7,
  Windbreaks = 8,
  Roads = 9,
  WaterPond = 10,
  Buildings = 11,
  Equipment = 12,
  Fertilizers = 13,
  AlfalfaOperations = 14,
  SeasonalCropOperations = 15,
  LemonOperations = 16,
  MangoOperations = 17,
  SaidiDatesOperations = 18,
  LivestockOperations = 19,
  FishFarmOperations = 20,
  LandRent = 21,
  Salaries = 22,
  BankOrOther = 23
}

export const EXPENSE_CATEGORY_AR: Record<number, string> = {
  1: 'نثريات', 2: 'البحث وإيجاد الأرض', 3: 'تأسيس شركة',
  4: 'البئر', 5: 'الطاقة الشمسية', 6: 'شبكة الري',
  7: 'تجهيز الأرض', 8: 'مصدات الرياح', 9: 'طرق',
  10: 'بركة مياه', 11: 'الإنشاءات', 12: 'المعدات',
  13: 'أسمدة', 14: 'البرسيم الحجازي', 15: 'زراعة موسمية',
  16: 'ليمون', 17: 'مانجو', 18: 'تمور صعيدي',
  19: 'إنتاج حيواني', 20: 'مزرعة سمكية', 21: 'إيجار الأرض',
  22: 'رواتب', 23: 'بنك / مصادر أخرى'
};

export const INCOME_CATEGORY_AR: Record<number, string> = {
  1: 'مساهمات المساهمين', 2: 'مبيعات البرسيم الحجازي',
  3: 'مبيعات زراعة موسمية', 4: 'مبيعات ليمون',
  5: 'مبيعات مانجو', 6: 'مبيعات تمور صعيدي',
  7: 'مبيعات إنتاج حيواني', 8: 'مبيعات مزرعة سمكية',
  9: 'بنك / مصادر أخرى'
};
