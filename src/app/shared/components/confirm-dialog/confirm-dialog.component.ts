import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-overlay" *ngIf="visible" (click)="cancel.emit()">
      <div class="modal" style="max-width:400px" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>{{ icon }} {{ title }}</h3>
          <button class="close-btn" (click)="cancel.emit()">✕</button>
        </div>
        <div class="modal-body">
          <p>{{ message }}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" (click)="cancel.emit()">{{ cancelLabel }}</button>
          <button class="btn" [class]="confirmClass" (click)="confirm.emit()" [disabled]="loading">
            <span class="spinner-sm" *ngIf="loading"></span>
            {{ loading ? 'جاري...' : confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class ConfirmDialogComponent {
  @Input() visible = false;
  @Input() title   = 'تأكيد';
  @Input() message = 'هل أنت متأكد؟';
  @Input() icon    = '⚠️';
  @Input() confirmLabel = 'تأكيد';
  @Input() cancelLabel  = 'إلغاء';
  @Input() confirmClass = 'btn-danger';
  @Input() loading      = false;
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel  = new EventEmitter<void>();
}
