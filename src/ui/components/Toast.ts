export class Toast {
  private static toastEl: HTMLElement | null = null;
  private static timeoutId: number | null = null;

  public static show(message: string, duration = 3000) {
    if (!this.toastEl) {
      this.toastEl = document.createElement('div');
      this.toastEl.className = 'toast-notice';
      document.body.appendChild(this.toastEl);
    }

    this.toastEl.innerHTML = `<span>✨</span><span>${message}</span>`;
    this.toastEl.classList.add('show');

    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = window.setTimeout(() => {
      this.toastEl?.classList.remove('show');
    }, duration);
  }
}
