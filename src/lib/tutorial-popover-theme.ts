import type { PopoverDOM } from 'driver.js';

export function applyTutorialPopoverTheme(popover: PopoverDOM) {
  const { wrapper, title, description, progress, footer, closeButton, previousButton, nextButton, footerButtons, arrow } = popover;

  wrapper.style.background = 'hsl(var(--popover) / 0.98)';
  wrapper.style.color = 'hsl(var(--popover-foreground))';
  wrapper.style.border = '1px solid hsl(var(--border) / 0.9)';
  wrapper.style.borderRadius = '20px';
  wrapper.style.boxShadow = '0 24px 60px -24px hsl(var(--foreground) / 0.35)';
  wrapper.style.backdropFilter = 'blur(18px)';
  wrapper.style.padding = '16px';
  wrapper.style.minWidth = '300px';
  wrapper.style.maxWidth = '360px';

  title.style.fontSize = '1.05rem';
  title.style.fontWeight = '700';
  title.style.lineHeight = '1.4';
  title.style.letterSpacing = '-0.02em';
  title.style.color = 'hsl(var(--foreground))';
  title.style.paddingRight = '2rem';

  description.style.fontSize = '0.92rem';
  description.style.lineHeight = '1.55';
  description.style.color = 'hsl(var(--muted-foreground))';
  description.style.marginTop = '0.35rem';

  progress.style.fontSize = '0.7rem';
  progress.style.fontWeight = '800';
  progress.style.letterSpacing = '0.16em';
  progress.style.textTransform = 'uppercase';
  progress.style.color = 'hsl(var(--primary))';

  footer.style.display = 'flex';
  footer.style.gap = '0.75rem';
  footer.style.justifyContent = 'space-between';
  footer.style.alignItems = 'center';
  footer.style.marginTop = '1rem';
  footer.style.paddingTop = '0.85rem';
  footer.style.borderTop = '1px solid hsl(var(--border) / 0.7)';

  footerButtons.style.display = 'flex';
  footerButtons.style.gap = '0.5rem';

  closeButton.style.color = 'hsl(var(--muted-foreground))';
  closeButton.style.borderRadius = '9999px';
  closeButton.style.width = '2rem';
  closeButton.style.height = '2rem';
  closeButton.style.top = '0.7rem';
  closeButton.style.right = '0.7rem';

  const styleButton = (button: HTMLButtonElement, mode: 'primary' | 'secondary') => {
    button.style.borderRadius = '12px';
    button.style.padding = '0.55rem 0.9rem';
    button.style.fontSize = '0.92rem';
    button.style.fontWeight = '600';
    button.style.textShadow = 'none';
    button.style.boxShadow = mode === 'primary' ? '0 10px 24px -12px hsl(var(--primary) / 0.75)' : 'none';
    button.style.border = mode === 'primary'
      ? '1px solid hsl(var(--primary))'
      : '1px solid hsl(var(--border))';
    button.style.background = mode === 'primary'
      ? 'hsl(var(--primary))'
      : 'hsl(var(--secondary))';
    button.style.color = mode === 'primary'
      ? 'hsl(var(--primary-foreground))'
      : 'hsl(var(--secondary-foreground))';
    button.style.cursor = button.disabled ? 'not-allowed' : 'pointer';
    button.style.opacity = button.disabled ? '0.5' : '1';
  };

  styleButton(previousButton, 'secondary');
  styleButton(nextButton, 'primary');

  if (arrow.classList.contains('driver-popover-arrow-side-top')) {
    arrow.style.borderTopColor = 'hsl(var(--popover))';
  }
  if (arrow.classList.contains('driver-popover-arrow-side-bottom')) {
    arrow.style.borderBottomColor = 'hsl(var(--popover))';
  }
  if (arrow.classList.contains('driver-popover-arrow-side-left')) {
    arrow.style.borderLeftColor = 'hsl(var(--popover))';
  }
  if (arrow.classList.contains('driver-popover-arrow-side-right')) {
    arrow.style.borderRightColor = 'hsl(var(--popover))';
  }
}
