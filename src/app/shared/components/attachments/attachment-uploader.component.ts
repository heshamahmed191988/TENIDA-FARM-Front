import { Component, EventEmitter, Input, OnDestroy, Output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpEventType } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { apiError } from '../../../core/utils/format';

interface UploadItem {
  key: number;
  name: string;
  isImage: boolean;
  previewUrl?: string;
  progress: number;
  status: 'uploading' | 'done' | 'error';
  id?: string;
  error?: string;
  sub?: Subscription;
}

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_BYTES = 10 * 1024 * 1024;
const COMPRESS_OVER_BYTES = 1.5 * 1024 * 1024;
const MAX_DIMENSION = 2200;

/**
 * Proof uploader (image or PDF). Files upload immediately; the parent receives the ids of
 * successfully uploaded files via `idsChange` and should block saving while `busyChange` is true.
 * Large / non-standard photos (e.g. iPhone HEIC opened by the browser) are re-encoded to JPEG in the browser.
 */
@Component({
  selector: 'app-attachment-uploader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="att-box" [class.invalid]="showError && required && !doneCount()" [class.drag]="dragOver()"
         (dragover)="$event.preventDefault(); dragOver.set(true)" (dragleave)="dragOver.set(false)" (drop)="onDrop($event)">
      <div class="att-head">
        <div>
          <div class="fw-bold text-sm">📎 مستندات الإثبات <span class="req" *ngIf="required">*</span></div>
          <div class="field-hint">صورة إيصال / فاتورة / إثبات تحويل — JPG أو PNG أو PDF (حتى ١٠ ميجا)</div>
        </div>
        <div class="d-flex gap-1" style="flex-wrap:wrap">
          <button type="button" class="btn btn-ghost btn-sm" (click)="camera.click()" [disabled]="items().length >= max">📷 التقاط صورة</button>
          <button type="button" class="btn btn-ghost btn-sm" (click)="picker.click()" [disabled]="items().length >= max">📁 اختيار ملف</button>
        </div>
      </div>

      <input #camera type="file" accept="image/*" capture="environment" hidden (change)="onPick($event)">
      <input #picker type="file" accept="image/jpeg,image/png,image/webp,application/pdf,image/*" multiple hidden (change)="onPick($event)">

      <div class="att-list" *ngIf="items().length; else empty">
        <div class="att-item" *ngFor="let it of items()" [class.err]="it.status === 'error'">
          <div class="att-thumb">
            <img *ngIf="it.previewUrl" [src]="it.previewUrl" alt="">
            <span *ngIf="!it.previewUrl">{{ it.isImage ? '🖼️' : '📄' }}</span>
          </div>
          <div class="att-meta">
            <div class="att-name" [title]="it.name">{{ it.name }}</div>
            <div class="progress" *ngIf="it.status === 'uploading'"><div class="progress-bar" [style.width.%]="it.progress"></div></div>
            <div class="field-hint text-success" *ngIf="it.status === 'done'">✓ تم الرفع</div>
            <div class="field-hint text-danger" *ngIf="it.status === 'error'">{{ it.error }}</div>
          </div>
          <button type="button" class="btn btn-icon btn-sm" title="إزالة" (click)="remove(it)">✕</button>
        </div>
      </div>
      <ng-template #empty>
        <div class="att-empty">اسحب الملف هنا أو استخدم الأزرار بالأعلى</div>
      </ng-template>

      <div class="field-hint text-danger mt-1" *ngIf="showError && required && !doneCount()">
        يجب إرفاق مستند واحد على الأقل يثبت الحركة
      </div>
    </div>
  `,
  styles: [`
    .att-box { border:1px dashed rgba(200,168,75,.4); border-radius:12px; padding:.85rem 1rem; background:rgba(200,168,75,.04); transition:var(--tr); }
    .att-box.drag { border-color:var(--secondary); background:rgba(200,168,75,.1); }
    .att-box.invalid { border-color:rgba(244,67,54,.6); background:rgba(244,67,54,.05); }
    .att-head { display:flex; justify-content:space-between; align-items:center; gap:.75rem; flex-wrap:wrap; }
    .att-list { display:flex; flex-direction:column; gap:.5rem; margin-top:.75rem; }
    .att-item { display:flex; align-items:center; gap:.7rem; padding:.45rem .55rem; border:1px solid var(--border-light); border-radius:10px; background:rgba(255,255,255,.03); }
    .att-item.err { border-color:rgba(244,67,54,.45); }
    .att-thumb { width:46px; height:46px; border-radius:8px; overflow:hidden; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,.06); font-size:1.4rem; flex-shrink:0; }
    .att-thumb img { width:100%; height:100%; object-fit:cover; }
    .att-meta { flex:1; min-width:0; display:flex; flex-direction:column; gap:.25rem; }
    .att-name { font-size:.82rem; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; direction:ltr; text-align:right; }
    .att-empty { margin-top:.7rem; text-align:center; font-size:.8rem; color:var(--text-muted); padding:.6rem; }
  `]
})
export class AttachmentUploaderComponent implements OnDestroy {
  @Input() required = true;
  @Input() max = 5;
  /** Set by the parent after a submit attempt to reveal the "required" message. */
  @Input() showError = false;
  @Output() idsChange = new EventEmitter<string[]>();
  @Output() busyChange = new EventEmitter<boolean>();

  private api = inject(ApiService);
  private toastr = inject(ToastrService);

  items = signal<UploadItem[]>([]);
  dragOver = signal(false);
  doneCount = computed(() => this.items().filter(i => i.status === 'done').length);
  private seq = 0;

  ngOnDestroy() {
    this.items().forEach(i => { i.sub?.unsubscribe(); if (i.previewUrl) URL.revokeObjectURL(i.previewUrl); });
  }

  onPick(ev: Event) {
    const input = ev.target as HTMLInputElement;
    this.addFiles(Array.from(input.files ?? []));
    input.value = '';
  }

  onDrop(ev: DragEvent) {
    ev.preventDefault();
    this.dragOver.set(false);
    this.addFiles(Array.from(ev.dataTransfer?.files ?? []));
  }

  remove(it: UploadItem) {
    it.sub?.unsubscribe();
    if (it.previewUrl) URL.revokeObjectURL(it.previewUrl);
    this.items.update(list => list.filter(x => x.key !== it.key));
    this.emit();
  }

  /** Clears the list (e.g. when the parent form is reset). */
  reset() {
    this.items().forEach(i => this.remove(i));
  }

  private async addFiles(files: File[]) {
    for (const file of files) {
      if (this.items().length >= this.max) {
        this.toastr.warning(`الحد الأقصى ${this.max} مستندات لكل حركة`);
        break;
      }
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);
      if (!isPdf && !isImage) {
        this.toastr.error(`«${file.name}» ليس صورة أو PDF`);
        continue;
      }

      const item: UploadItem = { key: ++this.seq, name: file.name, isImage, progress: 0, status: 'uploading' };
      this.items.update(list => [...list, item]);
      this.emit();

      let blob: Blob = file;
      let name = file.name;
      if (isImage) {
        try {
          const prepared = await this.prepareImage(file);
          blob = prepared.blob;
          name = prepared.name;
          item.previewUrl = URL.createObjectURL(blob);
        } catch {
          this.fail(item, 'تعذر قراءة الصورة — جرّب صيغة JPG أو PNG');
          continue;
        }
      }

      if (blob.size > MAX_BYTES) { this.fail(item, 'حجم الملف أكبر من ١٠ ميجابايت'); continue; }
      if (!ALLOWED.includes(blob.type) && !isPdf) { this.fail(item, 'صيغة غير مدعومة'); continue; }

      item.sub = this.api.uploadAttachment(blob, name).subscribe({
        next: ev => {
          if (ev.type === HttpEventType.UploadProgress && ev.total) {
            this.patch(item, { progress: Math.round((ev.loaded / ev.total) * 100) });
          } else if (ev.type === HttpEventType.Response) {
            this.patch(item, { status: 'done', progress: 100, id: ev.body?.data.id });
            this.emit();
          }
        },
        error: e => this.fail(item, apiError(e, 'فشل رفع الملف')),
      });
    }
  }

  private fail(item: UploadItem, error: string) {
    this.patch(item, { status: 'error', error });
    this.emit();
  }

  private patch(item: UploadItem, changes: Partial<UploadItem>) {
    Object.assign(item, changes);
    this.items.update(list => [...list]);
  }

  private emit() {
    this.idsChange.emit(this.items().filter(i => i.status === 'done' && i.id).map(i => i.id!));
    this.busyChange.emit(this.items().some(i => i.status === 'uploading'));
  }

  /**
   * Keeps small JPEG/PNG/WEBP as-is; re-encodes big or exotic images (HEIC…) to JPEG ≤ 2200px.
   */
  private async prepareImage(file: File): Promise<{ blob: Blob; name: string }> {
    const standard = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
    if (standard && file.size <= COMPRESS_OVER_BYTES) return { blob: file, name: file.name };

    const bitmap = await this.loadImage(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error('encode'))), 'image/jpeg', 0.82));
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'صورة';
    return { blob, name: `${baseName}.jpg` };
  }

  private loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode')); };
      img.src = url;
    });
  }
}
