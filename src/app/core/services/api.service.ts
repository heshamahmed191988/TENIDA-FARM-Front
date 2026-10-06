import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpEvent, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  ApiResponse, AuthResponse, LoginRequest, Attachment,
  JournalEntry, JournalEntryInput, JournalQuery, JournalQueryResult,
  FinanceSummary, ActivitySummaryRow, ActivityReport, PayrollReport,
  ShareholdersOverview, ShareholderPosition, ShareholderInput, InstallmentInput, ContributionInput,
  Worker, WorkerInput, SalaryPaymentInput,
  AssetsOverview, AssetDetail, AssetRow, AssetInput, Maintenance, MaintenanceInput, MaintenanceUpdateInput,
  LookupBundle, LookupItem, LookupInput, FarmSettings, FarmSettingsInput,
  DashboardData, CropSummary, CropDetail, CropCycle, CropCycleInput, Harvest, HarvestInput
} from '../models/models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  private get<T>(path: string, params?: HttpParams): Observable<T> {
    return this.http.get<ApiResponse<T>>(`${this.base}${path}`, { params }).pipe(map(r => r.data));
  }
  private post<T>(path: string, body: unknown = {}): Observable<T> {
    return this.http.post<ApiResponse<T>>(`${this.base}${path}`, body).pipe(map(r => r.data));
  }
  private put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<ApiResponse<T>>(`${this.base}${path}`, body).pipe(map(r => r.data));
  }
  private delete<T>(path: string): Observable<T> {
    return this.http.delete<ApiResponse<T>>(`${this.base}${path}`).pipe(map(r => r.data));
  }

  private static params(obj: object): HttpParams {
    let p = new HttpParams();
    Object.entries(obj).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') p = p.set(k, String(v));
    });
    return p;
  }

  // ── Auth ────────────────────────────────────────────────────────
  login(req: LoginRequest): Observable<AuthResponse> { return this.post<AuthResponse>('/auth/login', req); }
  refreshToken(refreshToken: string): Observable<AuthResponse> {
    return this.post<AuthResponse>('/auth/refresh', { refreshToken });
  }

  // ── Dashboard ───────────────────────────────────────────────────
  getDashboard(year?: number): Observable<DashboardData> {
    return this.get('/dashboard', ApiService.params({ year }));
  }
  getBalance(): Observable<{ currentBalance: number }> { return this.get('/dashboard/balance'); }

  // ── Journal ─────────────────────────────────────────────────────
  queryJournal(q: JournalQuery): Observable<JournalQueryResult> {
    return this.get('/transactions', ApiService.params(q));
  }
  getEntry(id: string): Observable<JournalEntry> { return this.get(`/transactions/${id}`); }
  createEntry(input: JournalEntryInput): Observable<JournalEntry> { return this.post('/transactions', input); }
  updateEntry(id: string, input: JournalEntryInput): Observable<JournalEntry> { return this.put(`/transactions/${id}`, input); }
  deleteEntry(id: string, reason?: string): Observable<unknown> {
    return this.http.delete<ApiResponse<unknown>>(`${this.base}/transactions/${id}`, { params: ApiService.params({ reason }) })
      .pipe(map(r => r.data));
  }
  recalculateBalances(): Observable<{ finalBalance: number }> { return this.post('/transactions/recalculate-balances'); }
  exportJournal(q: JournalQuery): Observable<Blob> {
    return this.http.get(`${this.base}/transactions/export`, { params: ApiService.params(q), responseType: 'blob' });
  }

  // ── Attachments (proof documents) ───────────────────────────────
  /** Upload one file; emits progress events then the response (data = Attachment). */
  uploadAttachment(file: Blob, fileName: string): Observable<HttpEvent<ApiResponse<Attachment>>> {
    const form = new FormData();
    form.append('file', file, fileName);
    return this.http.post<ApiResponse<Attachment>>(`${this.base}/attachments`, form, { reportProgress: true, observe: 'events' });
  }
  getAttachmentBlob(id: string): Observable<Blob> {
    return this.http.get(`${this.base}/attachments/${id}/content`, { responseType: 'blob' });
  }
  deleteAttachment(id: string): Observable<unknown> { return this.delete(`/attachments/${id}`); }
  getEntryAttachments(entryId: string): Observable<Attachment[]> { return this.get(`/transactions/${entryId}/attachments`); }
  linkAttachments(entryId: string, attachmentIds: string[]): Observable<Attachment[]> {
    return this.post(`/transactions/${entryId}/attachments`, { attachmentIds });
  }

  // ── Reports ─────────────────────────────────────────────────────
  getSummary(): Observable<FinanceSummary> { return this.get('/reports/summary'); }
  getActivities(): Observable<ActivitySummaryRow[]> { return this.get('/reports/activities'); }
  getActivityReport(id: string): Observable<ActivityReport> { return this.get(`/reports/activities/${id}`); }
  getPayroll(): Observable<PayrollReport> { return this.get('/reports/payroll'); }

  // ── Shareholders ────────────────────────────────────────────────
  getShareholders(): Observable<ShareholdersOverview> { return this.get('/shareholders'); }
  getShareholder(id: string): Observable<ShareholderPosition> { return this.get(`/shareholders/${id}`); }
  updateShareholder(id: string, input: ShareholderInput): Observable<ShareholderPosition> { return this.put(`/shareholders/${id}`, input); }
  addContribution(id: string, input: ContributionInput): Observable<JournalEntry> { return this.post(`/shareholders/${id}/contributions`, input); }
  addInstallment(id: string, input: InstallmentInput): Observable<ShareholderPosition> { return this.post(`/shareholders/${id}/installments`, input); }
  updateInstallment(id: string, input: InstallmentInput): Observable<unknown> { return this.put(`/shareholders/installments/${id}`, input); }
  deleteInstallment(id: string): Observable<unknown> { return this.delete(`/shareholders/installments/${id}`); }

  // ── Workers ─────────────────────────────────────────────────────
  getWorkers(includeInactive = true): Observable<Worker[]> {
    return this.get('/workers', ApiService.params({ includeInactive }));
  }
  createWorker(input: WorkerInput): Observable<Worker> { return this.post('/workers', input); }
  updateWorker(id: string, input: WorkerInput): Observable<Worker> { return this.put(`/workers/${id}`, input); }
  setWorkerActive(id: string, active: boolean): Observable<unknown> {
    return this.post(`/workers/${id}/${active ? 'activate' : 'deactivate'}`);
  }
  paySalary(id: string, input: SalaryPaymentInput): Observable<JournalEntry> { return this.post(`/workers/${id}/pay`, input); }

  // ── Assets ──────────────────────────────────────────────────────
  getAssets(): Observable<AssetsOverview> { return this.get('/assets'); }
  getAsset(id: string): Observable<AssetDetail> { return this.get(`/assets/${id}`); }
  createAsset(input: AssetInput): Observable<AssetRow> { return this.post('/assets', input); }
  updateAsset(id: string, input: AssetInput): Observable<AssetRow> { return this.put(`/assets/${id}`, input); }
  createMaintenance(assetId: string, input: MaintenanceInput): Observable<Maintenance> {
    return this.post(`/assets/${assetId}/maintenance`, input);
  }
  updateMaintenance(id: string, input: MaintenanceUpdateInput): Observable<Maintenance> {
    return this.put(`/assets/maintenance/${id}`, input);
  }

  // ── Lookups & settings ──────────────────────────────────────────
  getLookups(includeInactive = false): Observable<LookupBundle> {
    return this.get('/lookups', ApiService.params({ includeInactive }));
  }
  createLookup(input: LookupInput): Observable<LookupItem> { return this.post('/lookups', input); }
  updateLookup(id: string, input: LookupInput): Observable<LookupItem> { return this.put(`/lookups/${id}`, input); }
  deleteLookup(id: string): Observable<unknown> { return this.delete(`/lookups/${id}`); }
  getSettings(): Observable<FarmSettings> { return this.get('/settings'); }
  updateSettings(input: FarmSettingsInput): Observable<FarmSettings> { return this.put('/settings', input); }

  // ── Agriculture ─────────────────────────────────────────────────
  getCrops(): Observable<CropSummary[]> { return this.get('/crops'); }
  getCrop(id: string): Observable<CropDetail> { return this.get(`/crops/${id}`); }
  getActiveCycles(): Observable<CropCycle[]> { return this.get('/crops/active-cycles'); }
  createCycle(cropId: string, input: CropCycleInput): Observable<CropCycle> { return this.post(`/crops/${cropId}/cycles`, input); }
  completeCycle(cycleId: string): Observable<CropCycle> { return this.post(`/crops/cycles/${cycleId}/complete`); }
  reopenCycle(cycleId: string): Observable<CropCycle> { return this.post(`/crops/cycles/${cycleId}/reopen`); }
  addHarvest(cycleId: string, input: HarvestInput): Observable<Harvest> { return this.post(`/crops/cycles/${cycleId}/harvests`, input); }
  deleteHarvest(id: string): Observable<unknown> { return this.delete(`/crops/harvests/${id}`); }
}
