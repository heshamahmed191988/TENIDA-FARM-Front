import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, of, tap, shareReplay, finalize } from 'rxjs';
import { ApiService } from './api.service';
import { FarmSettings, LookupBundle, LookupItem, LOOKUP_CODES } from '../models/models';

/**
 * Shared finance state: cached lookup lists (for forms/filters) and the live treasury balance
 * shown in the header. Pages call `changed()` after any journal mutation.
 */
@Injectable({ providedIn: 'root' })
export class FinanceStateService {
  private api = inject(ApiService);

  readonly lookups = signal<LookupBundle | null>(null);
  readonly balance = signal<number | null>(null);
  readonly settings = signal<FarmSettings | null>(null);
  /** Proof document mandatory for new movements (FarmSettings.requireAttachments, default true). */
  readonly requireAttachments = computed(() => this.settings()?.requireAttachments ?? true);
  /** Increments after every journal change — pages can react with an effect. */
  readonly version = signal(0);

  private inflight$: Observable<LookupBundle> | null = null;

  readonly partnerContributionItem = computed(() =>
    this.lookups()?.incomeItems.find(i => i.code === LOOKUP_CODES.partnerContribution) ?? null);
  readonly salariesItem = computed(() =>
    this.lookups()?.expenseItems.find(i => i.code === LOOKUP_CODES.salaries) ?? null);

  loadLookups(force = false): Observable<LookupBundle> {
    const cached = this.lookups();
    if (cached && !force) return of(cached);
    if (!this.inflight$ || force) {
      this.inflight$ = this.api.getLookups(false).pipe(
        tap(b => this.lookups.set(b)),
        finalize(() => (this.inflight$ = null)),
        shareReplay(1));
    }
    return this.inflight$;
  }

  loadSettings(force = false) {
    if (this.settings() && !force) return;
    this.api.getSettings().subscribe({ next: s => this.settings.set(s), error: () => {} });
  }

  refreshBalance() {
    this.api.getBalance().subscribe({ next: r => this.balance.set(r.currentBalance), error: () => {} });
  }

  /** Call after creating/updating/deleting journal rows (or anything affecting balances/lists). */
  changed(opts: { lookups?: boolean } = {}) {
    this.refreshBalance();
    if (opts.lookups) this.loadLookups(true).subscribe();
    this.version.update(v => v + 1);
  }

  itemsFor(type: 'Income' | 'Expense'): LookupItem[] {
    const l = this.lookups();
    return (type === 'Income' ? l?.incomeItems : l?.expenseItems) ?? [];
  }
}
