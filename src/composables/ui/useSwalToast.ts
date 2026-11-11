// Toasts no intrusivos (esquina superior derecha) basados en SweetAlert2.
// Sustituyen al sistema propio de toasts (stores/toastStore.ts + ui/Toast.vue).
import Swal from 'sweetalert2';
import type { SweetAlertOptions } from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import 'animate.css';

const swalOptions: SweetAlertOptions = {
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  buttonsStyling: false,
  timer: 3500,
  timerProgressBar: true,
  customClass: {
    popup:
      'rounded-xl shadow-lg shadow-slate-900/5 px-4 py-3 border-0 flex items-center',
    title: 'text-sm font-semibold mb-0 pl-2 pr-6',
    htmlContainer: 'text-sm leading-relaxed text-slate-500 pl-2 pr-6',
  },
  showClass: {
    popup: 'animate__animated animate__fadeInRight animate__faster',
  },
  hideClass: {
    popup: 'animate__animated animate__fadeOutRight animate__faster',
  },
  didOpen: (toastEl) => {
    toastEl.addEventListener('mouseenter', Swal.stopTimer);
    toastEl.addEventListener('mouseleave', Swal.resumeTimer);
  },
};

const StyledSwal = Swal.mixin(swalOptions);

export function useSwalToast() {
  const showSuccess = (title: string) => {
    void StyledSwal.fire({
      icon: 'success',
      title,
      iconColor: '#059669',
      color: '#065f46',
      background: 'rgba(255, 255, 255, 0.95)',
      customClass: {
        popup:
          'rounded-xl shadow-lg shadow-slate-900/5 px-4 py-3 border-0 border-l-4 border-emerald-500 flex items-center',
        title: 'text-emerald-800 font-semibold mb-0 pl-2 pr-6',
        timerProgressBar: 'bg-emerald-500',
      },
    });
  };

  const showError = (title: string) => {
    void StyledSwal.fire({
      icon: 'error',
      title,
      iconColor: '#e11d48',
      color: '#9f1239',
      background: 'rgba(255, 255, 255, 0.95)',
      timer: 4500,
      customClass: {
        popup:
          'rounded-xl shadow-lg shadow-slate-900/5 px-4 py-3 border-0 border-l-4 border-rose-500 flex items-center',
        title: 'text-rose-800 font-semibold mb-0 pl-2 pr-6',
        timerProgressBar: 'bg-rose-500',
      },
    });
  };

  const showInfo = (title: string) => {
    void StyledSwal.fire({
      icon: 'info',
      title,
      iconColor: '#0284c7',
      color: '#0c4a6e',
      background: 'rgba(255, 255, 255, 0.95)',
      customClass: {
        popup:
          'rounded-xl shadow-lg shadow-slate-900/5 px-4 py-3 border-0 border-l-4 border-sky-500 flex items-center',
        title: 'text-sky-800 font-semibold mb-0 pl-2 pr-6',
        timerProgressBar: 'bg-sky-500',
      },
    });
  };

  return { showSuccess, showError, showInfo };
}
