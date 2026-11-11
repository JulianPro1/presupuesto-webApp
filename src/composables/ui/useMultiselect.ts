export interface MultiselectDefaultProps {
  trackBy: string;
  label: string;
  clearOnSelect: boolean;
  searchable: boolean;
}

export interface MultiselectDefaultClasses {
  container: string;
  option: string;
  iconContainer: string;
  icon: string;
  content: string;
  title: string;
  description: string;
  singleLabel: string;
  singleIcon: string;
  singleTitle: string;
}

/**
 * Props y clases por defecto de MultiselectCustom.
 * Las clases están alineadas con los overrides de
 * src/styles/multiselect-custom.css (.multiselect-custom y afines).
 */
export function useMultiselectDefaults(): {
  defaultProps: MultiselectDefaultProps;
  defaultClasses: MultiselectDefaultClasses;
} {
  return {
    defaultProps: {
      trackBy: 'name',
      label: 'name',
      clearOnSelect: false,
      searchable: true,
    },
    defaultClasses: {
      container: 'multiselect-custom',
      option: 'flex items-center',
      iconContainer: 'mr-6',
      icon: 'text-lg text-carioca-500',
      content: 'grow',
      title: 'font-medium text-slate-900',
      description: 'text-slate-500',
      singleLabel: 'flex items-center',
      singleIcon: 'text-lg text-carioca-500 mr-2',
      singleTitle: 'font-medium',
    },
  };
}

/**
 * Helpers de iconos/descripciones por rol (clases de icon-font).
 * Stub: la app usa helperType 'custom'; los mapas llegan por props.
 */
export function useRoleHelpers(): {
  getRoleIcon: (key: string) => string;
  getRoleDescription: (key: string) => string;
} {
  return {
    getRoleIcon: () => 'circle',
    getRoleDescription: () => '',
  };
}
