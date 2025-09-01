export function mountNewsletter(){
  const form = document.querySelector('footer input[type="email"]');
  const button = form?.nextElementSibling;
  if (!form || !button) return;
  button.addEventListener('click', (e) => {
    e.preventDefault();
    const email = form.value.trim();
    if (!email || !email.includes('@')) {
      button.textContent = '❌';
      button.classList.add('bg-red-400');
      setTimeout(() => { button.textContent = 'OK'; button.classList.remove('bg-red-400'); }, 2000);
      return;
    }
    button.textContent = '✓';
    button.classList.remove('bg-green-400');
    button.classList.add('bg-cyan-400');
    form.value = '';
    setTimeout(() => { button.textContent = 'OK'; button.classList.remove('bg-cyan-400'); button.classList.add('bg-green-400'); }, 3000);
  });
  form.addEventListener('keypress', (e) => { if (e.key === 'Enter') button.click(); });
}