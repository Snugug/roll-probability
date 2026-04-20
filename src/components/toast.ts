export function showToast(message: string): void {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toast.style.position = 'fixed';
  toast.style.left = '16px';
  toast.style.bottom = '16px';
  toast.style.background = '#1a1a2e';
  toast.style.color = '#e0e0e0';
  toast.style.padding = '10px 16px';
  toast.style.borderRadius = '6px';
  toast.style.fontSize = '13px';
  toast.style.border = '1px solid #333';
  toast.style.zIndex = '9999';
  toast.style.opacity = '0';
  toast.style.transition = 'opacity 0.2s';

  // Stack above existing toasts
  const existing = document.querySelectorAll('.toast');
  const offset = existing.length * 48;
  toast.style.bottom = `${16 + offset}px`;

  document.body.appendChild(toast);
  requestAnimationFrame(() => { toast.style.opacity = '1'; });

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => { toast.remove(); }, 200);
  }, 3000);
}
