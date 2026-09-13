export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
}

export interface PromptOptions {
  title: string;
  message: string;
  defaultValue?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
}

export interface AlertOptions {
  title: string;
  message: string;
  confirmText?: string;
}

export class JadeModal {
  private static overlayEl: HTMLElement | null = null;

  private static getOrCreateOverlay(): HTMLElement {
    if (!this.overlayEl) {
      this.overlayEl = document.createElement('div');
      this.overlayEl.className = 'modal-overlay jade-dialog-overlay';
      document.body.appendChild(this.overlayEl);
    }
    return this.overlayEl;
  }

  public static confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      const overlay = this.getOrCreateOverlay();
      const confirmText = options.confirmText || 'Confirm';
      const cancelText = options.cancelText || 'Cancel';
      const btnClass = options.isDanger ? 'btn-danger' : 'btn-primary';

      overlay.innerHTML = `
        <div class="modal-window jade-dialog-window">
          <div class="modal-header">
            <h3>${options.title}</h3>
            <button class="modal-close-btn" id="btn-dialog-x">✕</button>
          </div>
          <div class="modal-content jade-dialog-content">
            <div class="jade-dialog-message">${options.message}</div>
            <div class="jade-dialog-actions">
              <button class="jd-btn" id="btn-dialog-cancel">${cancelText}</button>
              <button class="jd-btn ${btnClass}" id="btn-dialog-confirm">${confirmText}</button>
            </div>
          </div>
        </div>
      `;

      overlay.classList.add('active');

      const cleanup = (result: boolean) => {
        overlay.classList.remove('active');
        overlay.innerHTML = '';
        document.removeEventListener('keydown', keyHandler);
        resolve(result);
      };

      const keyHandler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') cleanup(false);
        if (e.key === 'Enter') cleanup(true);
      };
      document.addEventListener('keydown', keyHandler);

      overlay.querySelector('#btn-dialog-confirm')?.addEventListener('click', () => cleanup(true));
      overlay.querySelector('#btn-dialog-cancel')?.addEventListener('click', () => cleanup(false));
      overlay.querySelector('#btn-dialog-x')?.addEventListener('click', () => cleanup(false));
      overlay.onclick = (e) => {
        if (e.target === overlay) cleanup(false);
      };
    });
  }

  public static prompt(options: PromptOptions): Promise<string | null> {
    return new Promise((resolve) => {
      const overlay = this.getOrCreateOverlay();
      const confirmText = options.confirmText || 'Save';
      const cancelText = options.cancelText || 'Cancel';
      const defaultVal = options.defaultValue || '';
      const placeholder = options.placeholder || '';

      overlay.innerHTML = `
        <div class="modal-window jade-dialog-window">
          <div class="modal-header">
            <h3>${options.title}</h3>
            <button class="modal-close-btn" id="btn-dialog-x">✕</button>
          </div>
          <div class="modal-content jade-dialog-content">
            <div class="jade-dialog-message">${options.message}</div>
            <input type="text" class="jd-input jade-dialog-input" id="jade-dialog-input-field" value="${defaultVal.replace(/"/g, '&quot;')}" placeholder="${placeholder}" maxlength="32" />
            <div class="jade-dialog-actions">
              <button class="jd-btn" id="btn-dialog-cancel">${cancelText}</button>
              <button class="jd-btn btn-primary" id="btn-dialog-confirm">${confirmText}</button>
            </div>
          </div>
        </div>
      `;

      overlay.classList.add('active');
      const input = overlay.querySelector('#jade-dialog-input-field') as HTMLInputElement;
      input?.focus();
      input?.select();

      const cleanup = (result: string | null) => {
        overlay.classList.remove('active');
        overlay.innerHTML = '';
        document.removeEventListener('keydown', keyHandler);
        resolve(result);
      };

      const keyHandler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') cleanup(null);
        if (e.key === 'Enter') cleanup(input?.value.trim() || null);
      };
      document.addEventListener('keydown', keyHandler);

      overlay.querySelector('#btn-dialog-confirm')?.addEventListener('click', () => cleanup(input?.value.trim() || null));
      overlay.querySelector('#btn-dialog-cancel')?.addEventListener('click', () => cleanup(null));
      overlay.querySelector('#btn-dialog-x')?.addEventListener('click', () => cleanup(null));
      overlay.onclick = (e) => {
        if (e.target === overlay) cleanup(null);
      };
    });
  }

  public static alert(options: AlertOptions): Promise<void> {
    return new Promise((resolve) => {
      const overlay = this.getOrCreateOverlay();
      const confirmText = options.confirmText || 'OK';

      overlay.innerHTML = `
        <div class="modal-window jade-dialog-window">
          <div class="modal-header">
            <h3>${options.title}</h3>
            <button class="modal-close-btn" id="btn-dialog-x">✕</button>
          </div>
          <div class="modal-content jade-dialog-content">
            <div class="jade-dialog-message">${options.message}</div>
            <div class="jade-dialog-actions">
              <button class="jd-btn btn-primary" id="btn-dialog-confirm">${confirmText}</button>
            </div>
          </div>
        </div>
      `;

      overlay.classList.add('active');

      const cleanup = () => {
        overlay.classList.remove('active');
        overlay.innerHTML = '';
        document.removeEventListener('keydown', keyHandler);
        resolve();
      };

      const keyHandler = (e: KeyboardEvent) => {
        if (e.key === 'Escape' || e.key === 'Enter') cleanup();
      };
      document.addEventListener('keydown', keyHandler);

      overlay.querySelector('#btn-dialog-confirm')?.addEventListener('click', () => cleanup());
      overlay.querySelector('#btn-dialog-x')?.addEventListener('click', () => cleanup());
      overlay.onclick = (e) => {
        if (e.target === overlay) cleanup();
      };
    });
  }
}
