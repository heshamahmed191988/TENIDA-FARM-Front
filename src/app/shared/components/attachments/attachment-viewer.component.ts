import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ToastrService } from 'ngx-toastr';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { FinanceStateService } from '../../../core/services/finance-state.service';
import { Attachment, JournalEntry } from '../../../core/models/models';
import { apiError, downloadBlob } from '../../../core/utils/format';
import { FORMAT_PIPES } from '../pipes/formatting.pipe';
import { AttachmentUploaderComponent } from './attachment-uploader.component';

interface Loaded extends Attachment { url?: string; safeUrl?: SafeResourceUrl; }

/** Shows the proof documents of a journal movement; writers can add more or remove extras. */
@Component({
  selector: 'app-attachment-viewer',
  standalone: true,
  imports: [CommonModule, AttachmentUploaderComponent, ...FORMAT_PIPES],
  template: `
    <div class="modal-overlay" (click)="closed.emit()">
      <div class="modal xl" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h3>📎 مستندات الحركة</h3>
          <button class="close-btn" (click)="closed.emit()" aria-label="إغلاق">✕</button>
        </div>
        <div class="modal-body">
          <div class="info-banner gold mb-2">
            <div>
              <div class="fw-bold">{{ entry.description }}</div>
              <div class="text-sm">{{ entry.transactionDate | arDate }} • {{ entry.itemName }} • {{ entry.amount | egp }}</div>
            </div>
          </div>

          <div class="loading-wrap" *ngIf="loading()"><div class="spinner"></div></div>

          <div class="empty-msg" *ngIf="!loading() && !files().length">
            لا توجد مستندات لهذه الحركة{{ auth.canWriteFinance() ? ' — أضف صورة الإيصال أو الفاتورة بالأسفل' : '' }}
          </div>

          <div class="viewer-layout" *ngIf="files().length">
            <div class="thumbs">
              <button *ngFor="let f of files()" class="thumb" [class.active]="f.id === current()?.id" (click)="current.set(f)">
                <img *ngIf="f.isImage && f.url" [src]="f.url" alt="">
                <span *ngIf="!f.isImage">📄</span>
              </button>
            </div>
            <div class="stage" *ngIf="current() as c">
              <img *ngIf="c.isImage && c.url" [src]="c.url" [alt]="c.fileName">
              <iframe *ngIf="!c.isImage && c.safeUrl" [src]="c.safeUrl" title="PDF"></iframe>
              <div class="stage-bar">
                <span class="text-sm" style="direction:ltr">{{ c.fileName }}</span>
                <span class="cell-sub">{{ (c.sizeBytes / 1024) | egp:'plain' }} ك.ب • رفعه {{ c.createdBy || '—' }} • {{ c.createdAt | arDate }}</span>
                <span class="spacer" style="flex:1"></span>
                <button class="btn btn-ghost btn-sm" (click)="openNewTab(c)">↗ فتح</button>
                <button class="btn btn-ghost btn-sm" (click)="download(c)">⬇ تحميل</button>
                <button class="btn btn-ghost btn-sm text-danger" (click)="remove(c)" *ngIf="auth.canWriteFinance()">🗑️ حذف</button>
              </div>
            </div>
          </div>

          <div class="mt-2" *ngIf="auth.canWriteFinance()">
            <app-attachment-uploader [required]="false" (idsChange)="newIds = $event" (busyChange)="uploading.set($event)"></app-attachment-uploader>
            <div class="d-flex justify-between align-center mt-1" *ngIf="newIds.length">
              <span class="text-sm">{{ newIds.length }} مستند جاهز للإرفاق</span>
              <button class="btn btn-primary btn-sm" (click)="link()" [disabled]="uploading() || saving()">إرفاق بالحركة</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .viewer-layout { display:grid; grid-template-columns:90px 1fr; gap:1rem; }
    .thumbs { display:flex; flex-direction:column; gap:.5rem; max-height:560px; overflow:auto; }
    .thumb { width:84px; height:84px; border-radius:10px; overflow:hidden; border:2px solid var(--border-light); background:rgba(255,255,255,.04);
      cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:2rem; padding:0; }
    .thumb.active { border-color:var(--secondary); }
    .thumb img { width:100%; height:100%; object-fit:cover; }
    .stage { display:flex; flex-direction:column; gap:.6rem; min-width:0; }
    .stage img { max-width:100%; max-height:520px; object-fit:contain; border-radius:10px; background:#000; align-self:center; }
    .stage iframe { width:100%; height:520px; border:none; border-radius:10px; background:#fff; }
    .stage-bar { display:flex; align-items:center; gap:.6rem; flex-wrap:wrap; }
    @media (max-width: 700px) { .viewer-layout { grid-template-columns:1fr; } .thumbs { flex-direction:row; } .stage iframe { height:380px; } }
  `]
})
export class AttachmentViewerComponent implements OnInit, OnDestroy {
  @ViewChild(AttachmentUploaderComponent) uploader?: AttachmentUploaderComponent;
  @Input({ required: true }) entry!: JournalEntry;
  /** Emits the new attachment count after adding / removing files. */
  @Output() changed = new EventEmitter<number>();
  @Output() closed = new EventEmitter<void>();

  private api = inject(ApiService);
  private toastr = inject(ToastrService);
  private sanitizer = inject(DomSanitizer);
  private state = inject(FinanceStateService);
  auth = inject(AuthService);

  files = signal<Loaded[]>([]);
  current = signal<Loaded | null>(null);
  loading = signal(true);
  uploading = signal(false);
  saving = signal(false);
  newIds: string[] = [];

  ngOnInit() { this.load(); }
  ngOnDestroy() { this.revoke(); }

  private load() {
    this.loading.set(true);
    this.api.getEntryAttachments(this.entry.id).subscribe({
      next: list => {
        this.revoke();
        const loaded: Loaded[] = list.map(a => ({ ...a }));
        this.files.set(loaded);
        this.current.set(loaded[0] ?? null);
        this.loading.set(false);
        if (!loaded.length) return;
        forkJoin(loaded.map(a => this.api.getAttachmentBlob(a.id))).subscribe({
          next: blobs => {
            blobs.forEach((b, i) => {
              const url = URL.createObjectURL(b);
              loaded[i].url = url;
              if (!loaded[i].isImage) loaded[i].safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
            });
            this.files.set([...loaded]);
            this.current.set(loaded.find(l => l.id === this.current()?.id) ?? loaded[0]);
          },
          error: e => this.toastr.error(apiError(e, 'تعذر تحميل الملفات')),
        });
      },
      error: e => { this.loading.set(false); this.toastr.error(apiError(e)); }
    });
  }

  openNewTab(f: Loaded) { if (f.url) window.open(f.url, '_blank'); }

  download(f: Loaded) {
    this.api.getAttachmentBlob(f.id).subscribe(b => downloadBlob(b, f.fileName));
  }

  remove(f: Loaded) {
    if (!confirm(`حذف المستند «${f.fileName}»؟`)) return;
    this.api.deleteAttachment(f.id).subscribe({
      next: () => { this.toastr.success('تم حذف المستند'); this.afterChange(); },
      error: e => this.toastr.error(apiError(e, 'تعذر الحذف')),
    });
  }

  link() {
    if (!this.newIds.length) return;
    this.saving.set(true);
    this.api.linkAttachments(this.entry.id, this.newIds).subscribe({
      next: () => {
        this.saving.set(false);
        this.newIds = [];
        this.uploader?.reset();
        this.toastr.success('تم إرفاق المستندات بالحركة');
        this.afterChange();
      },
      error: e => { this.saving.set(false); this.toastr.error(apiError(e, 'تعذر الإرفاق')); }
    });
  }

  private afterChange() {
    this.state.changed();
    this.api.getEntryAttachments(this.entry.id).subscribe(list => this.changed.emit(list.length));
    this.load();
  }

  private revoke() {
    this.files().forEach(f => f.url && URL.revokeObjectURL(f.url));
  }
}
