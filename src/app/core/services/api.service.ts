import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  ApiResponse, AuthResponse, LoginRequest, DashboardStats,
  Transaction, CreateTransactionRequest, Shareholder, RecordPaymentRequest,
  Crop, CropCycle, Harvest, InfrastructureItem, MaintenanceRequest,
  Worker, SalaryPayment, MonthlyChart
} from '../models/models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  private get<T>(path: string, params?: HttpParams): Observable<T> {
    return this.http.get<ApiResponse<T>>(`${this.base}${path}`, { params })
      .pipe(map(r => r.Data));
  }

  private post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<ApiResponse<T>>(`${this.base}${path}`, body)
      .pipe(map(r => r.Data));
  }

  private put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<ApiResponse<T>>(`${this.base}${path}`, body)
      .pipe(map(r => r.Data));
  }

  private delete<T>(path: string): Observable<T> {
    return this.http.delete<ApiResponse<T>>(`${this.base}${path}`)
      .pipe(map(r => r.Data));
  }

  // ── Auth ────────────────────────────────────────────────────────
  login(req: LoginRequest): Observable<AuthResponse> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.base}/auth/login`, req)
      .pipe(map(r => r.Data));
  }

  refreshToken(refreshToken: string): Observable<AuthResponse> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.base}/auth/refresh`, { refreshToken })
      .pipe(map(r => r.Data));
  }

  // ── Dashboard ───────────────────────────────────────────────────
  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<ApiResponse<DashboardStats>>(`${this.base}/dashboard/stats`)
      .pipe(map(r => r.Data));
  }

  getCurrentBalance(): Observable<{ CurrentBalanceSar: number; totalIncome: number; totalExpense: number }> {
    return this.http.get<ApiResponse<any>>(`${this.base}/dashboard/balance`)
      .pipe(map(r => r.Data));
  }

  getExpenseSummary(from?: string, to?: string): Observable<{ items: { category: string; amount: number; percentage: number }[]; totalSar: number }> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<ApiResponse<any>>(`${this.base}/dashboard/expense-summary`, { params })
      .pipe(map(r => r.Data));
  }

  getMonthlyChart(year: number): Observable<{ year: number; months: MonthlyChart[] }> {
    return this.http.get<ApiResponse<any>>(`${this.base}/dashboard/monthly-chart/${year}`)
      .pipe(map(r => r.Data));
  }

  // ── Transactions ────────────────────────────────────────────────
  getTransactions(params?: {
    page?: number; pageSize?: number; from?: string; to?: string;
    expenseCategory?: number; incomeCategory?: number; shareholderId?: string;
  }): Observable<{ data: Transaction[]; pagination: any; currentBalanceSar: number }> {
    let p = new HttpParams();
    if (params?.page) p = p.set('page', params.page);
    if (params?.pageSize) p = p.set('pageSize', params.pageSize);
    if (params?.from) p = p.set('from', params.from);
    if (params?.to) p = p.set('to', params.to);
    if (params?.expenseCategory) p = p.set('expenseCategory', params.expenseCategory);
    if (params?.shareholderId) p = p.set('shareholderId', params.shareholderId);
    return this.http.get<any>(`${this.base}/transactions`, { params: p })
      .pipe(map(r => ({ data: r.data, pagination: r.pagination, currentBalanceSar: r.currentBalanceSar })));
  }

  createTransaction(req: CreateTransactionRequest): Observable<Transaction> {
    return this.http.post<ApiResponse<Transaction>>(`${this.base}/transactions`, req)
      .pipe(map(r => r.Data));
  }

  updateTransaction(id: string, req: CreateTransactionRequest): Observable<Transaction> {
    return this.http.put<ApiResponse<Transaction>>(`${this.base}/transactions/${id}`, req)
      .pipe(map(r => r.Data));
  }

  deleteTransaction(id: string): Observable<void> {
    return this.http.delete<any>(`${this.base}/transactions/${id}`).pipe(map(() => void 0));
  }

  recalculateBalances(): Observable<{ finalBalance: number }> {
    return this.http.post<ApiResponse<any>>(`${this.base}/transactions/recalculate-balances`, {})
      .pipe(map(r => r.Data));
  }

  exportTransactions(): Observable<any> {
    return this.http.get<any>(`${this.base}/transactions/export`).pipe(map(r => r.data));
  }

  // ── Shareholders ────────────────────────────────────────────────
  getShareholders(): Observable<{ data: Shareholder[]; summary: any }> {
    return this.http.get<any>(`${this.base}/shareholders`)
      .pipe(map(r => ({ data: r.data, summary: r.summary })));
  }

  getShareholder(id: string): Observable<Shareholder> {
    return this.get<Shareholder>(`/shareholders/${id}`);
  }

  recordInstallmentPayment(shareholderId: string, installmentId: string, req: RecordPaymentRequest): Observable<any> {
    return this.http.post<ApiResponse<any>>(
      `${this.base}/shareholders/${shareholderId}/installments/${installmentId}/pay`, req
    ).pipe(map(r => r.Data));
  }

  getOverdueInstallments(): Observable<any[]> {
    return this.get<any[]>('/shareholders/installments/overdue');
  }

  getShareholderSummaryTable(): Observable<any> {
    return this.get<any>('/shareholders/summary-table');
  }

  // ── Crops ───────────────────────────────────────────────────────
  getCrops(): Observable<Crop[]> {
    return this.http.get<ApiResponse<Crop[]>>(`${this.base}/crops`)
      .pipe(map(r => r.Data));
  }

  getCrop(id: string): Observable<Crop> {
    return this.get<Crop>(`/crops/${id}`);
  }

  getActiveCycles(): Observable<CropCycle[]> {
    return this.get<CropCycle[]>('/crops/active-cycles');
  }

  getCropRevenueSummary(): Observable<any> {
    return this.get<any>('/crops/revenue-summary');
  }

  createCropCycle(cropId: string, data: Partial<CropCycle>): Observable<CropCycle> {
    return this.http.post<ApiResponse<CropCycle>>(`${this.base}/crops/${cropId}/cycles`, data)
      .pipe(map(r => r.Data));
  }

  recordHarvest(cycleId: string, data: Partial<Harvest>): Observable<Harvest> {
    return this.http.post<ApiResponse<Harvest>>(`${this.base}/crops/cycles/${cycleId}/harvests`, data)
      .pipe(map(r => r.Data));
  }

  // ── Infrastructure ──────────────────────────────────────────────
  getInfrastructure(): Observable<{ data: InfrastructureItem[]; summary: any }> {
    return this.http.get<any>(`${this.base}/infrastructure`)
      .pipe(map(r => ({ data: r.data, summary: r.summary })));
  }

  getInfrastructureItem(id: string): Observable<InfrastructureItem> {
    return this.get<InfrastructureItem>(`/infrastructure/${id}`);
  }

  getPendingMaintenance(): Observable<MaintenanceRequest[]> {
    return this.get<MaintenanceRequest[]>('/infrastructure/maintenance/pending');
  }

  createMaintenanceRequest(itemId: string, data: Partial<MaintenanceRequest>): Observable<MaintenanceRequest> {
    return this.http.post<ApiResponse<MaintenanceRequest>>(
      `${this.base}/infrastructure/${itemId}/maintenance`, data
    ).pipe(map(r => r.Data));
  }

  // ── Workers ─────────────────────────────────────────────────────
  getWorkers(): Observable<{ data: Worker[]; totalSalariesPaidSar: number }> {
    return this.http.get<any>(`${this.base}/workers`)
      .pipe(map(r => ({ data: r.data, totalSalariesPaidSar: r.totalSalariesPaidSar })));
  }

  getWorker(id: string): Observable<Worker> {
    return this.get<Worker>(`/workers/${id}`);
  }

  createWorker(data: Partial<Worker>): Observable<Worker> {
    return this.http.post<ApiResponse<Worker>>(`${this.base}/workers`, data)
      .pipe(map(r => r.Data));
  }

  updateWorker(id: string, data: Partial<Worker>): Observable<Worker> {
    return this.http.put<ApiResponse<Worker>>(`${this.base}/workers/${id}`, data)
      .pipe(map(r => r.Data));
  }

  getMonthlyPayroll(year: number, month: number): Observable<any> {
    return this.get<any>(`/workers/payroll/${year}/${month}`);
  }

  // ── Reports ─────────────────────────────────────────────────────
  getTreasurySummary(): Observable<any> {
    return this.get<any>('/reports/treasury-summary');
  }

  // ── Currency ────────────────────────────────────────────────────
  convertCurrency(amount: number, from = 2, to = 1): Observable<any> {
    const params = new HttpParams().set('amount', amount).set('from', from).set('to', to);
    return this.get<any>('/currency/convert', params);
  }
}
