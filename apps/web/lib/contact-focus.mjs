/** Focus the first invalid control in document order after errors render. */
export function focusFirstInvalid(form) {
  const control = form?.querySelector('[aria-invalid="true"]');
  if (control && typeof control.focus === 'function') control.focus();
}
