// Modales de confirmación/alerta centrados, basados en SweetAlert2.
// Sustituyen a los diálogos alert()/confirm() nativos y al hack de doble clic.
import Swal from 'sweetalert2';
import type { SweetAlertOptions } from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

const swalOptions: SweetAlertOptions = {
  customClass: {
    popup: 'rounded-2xl shadow-xl px-2',
    title: 'text-slate-900 font-bold pt-2',
    htmlContainer: 'text-sm leading-relaxed text-slate-500',
    confirmButton:
      'inline-flex items-center justify-center font-semibold rounded-lg bg-sky-600 text-white shadow-sm px-4 py-2 mx-1 transition-colors hover:bg-sky-700',
    cancelButton:
      'inline-flex items-center justify-center font-semibold rounded-lg border border-slate-200 text-slate-600 shadow-sm mx-1 px-4 py-2 transition-colors hover:bg-slate-50',
  },
  buttonsStyling: false,
};

const StyledSwal = Swal.mixin(swalOptions);

export function useSwal() {
  const showSuccess = (title = 'Operación exitosa', text?: string) =>
    StyledSwal.fire({
      icon: 'success',
      title,
      text,
      iconColor: '#059669',
      timer: 2000,
      showConfirmButton: false,
    });

  const showError = (title = 'Ocurrió un error', text?: string) =>
    StyledSwal.fire({
      icon: 'error',
      title,
      text,
      iconColor: '#e11d48',
      timer: 4000,
      showConfirmButton: false,
    });

  /**
   * Modal de confirmación accesible (reemplaza a window.confirm()).
   * Resuelve a true si el usuario confirma, false si cancela.
   */
  const showConfirm = async (
    title: string,
    text: string,
    options: SweetAlertOptions = {},
  ): Promise<boolean> => {
    const result = await StyledSwal.fire({
      title,
      text,
      icon: 'warning',
      iconColor: '#d97706',
      showCancelButton: true,
      confirmButtonText: 'Sí, continuar',
      cancelButtonText: 'Cancelar',
      ...options,
    });
    return result.isConfirmed;
  };

  return { showSuccess, showError, showConfirm };
}
