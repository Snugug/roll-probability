import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('showToast', () => {
  beforeEach(() => {
    document.body.replaceChildren();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates a toast element with the message', async () => {
    const { showToast } = await import('../src/components/toast');
    showToast('Something went wrong');
    const toast = document.querySelector('.toast') as HTMLElement;
    expect(toast).not.toBeNull();
    expect(toast.textContent).toBe('Something went wrong');
  });

  it('positions toast at bottom-left', async () => {
    const { showToast } = await import('../src/components/toast');
    showToast('Error');
    const toast = document.querySelector('.toast') as HTMLElement;
    expect(toast.style.position).toBe('fixed');
    expect(toast.style.bottom).toBe('16px');
    expect(toast.style.left).toBe('16px');
  });

  it('removes toast after 3 seconds', async () => {
    const { showToast } = await import('../src/components/toast');
    showToast('Temporary');
    expect(document.querySelector('.toast')).not.toBeNull();
    vi.advanceTimersByTime(3500);
    expect(document.querySelector('.toast')).toBeNull();
  });

  it('stacks multiple toasts', async () => {
    const { showToast } = await import('../src/components/toast');
    showToast('First');
    showToast('Second');
    const toasts = document.querySelectorAll('.toast');
    expect(toasts.length).toBe(2);
  });
});
