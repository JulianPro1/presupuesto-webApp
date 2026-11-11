import { TABLE_ACTIONS } from '@/const/tableConst'
import { useAccessControl } from '@/composables/auth/useAccessControl'
import { PERMISSIONS } from '@/const/permissions'

// Interface que coincide con CustomTable
export interface Action {
  name: string
  icon: string
  class: string
  tooltip?: string
}

/**
 * Configuración de permisos por acción
 * Ahora usa strings de permisos en vez de arrays de roles
 */
export interface ActionPermissionConfig {
  [actionName: string]: {
    permission?: string // Permiso requerido (ej: 'company.update')
    permissions?: string[] // Múltiples permisos (requiere todos)
    anyPermission?: string[] // Requiere al menos uno
    allowAll?: boolean // Permitir sin verificar
  }
}

export const useTableActions = () => {
  const { can, canAll, canAny, isAuthenticated } = useAccessControl()

  /**
   * Configuración de permisos por defecto para acciones de tabla
   * Mapea nombre de acción -> permiso requerido
   */
  const defaultActionPermissions: ActionPermissionConfig = {
    edit: {
      // Por defecto, edit requiere el permiso .update del módulo
      // Se sobreescribe con getModuleActions()
      allowAll: true,
    },
    toggleStatus: {
      allowAll: true,
    },
    delete: {
      allowAll: true,
    },
    view: {
      allowAll: true,
    },
    generateOutcome: {
      allowAll: true,
    },
  }

  /**
   * Verificar si una acción está permitida según su configuración
   */
  const isActionAllowed = (config: ActionPermissionConfig[string]): boolean => {
    if (!config) return true
    if (config.allowAll) return true

    // Permiso único
    if (config.permission) {
      return can(config.permission)
    }

    // Múltiples permisos (requiere todos)
    if (config.permissions && config.permissions.length > 0) {
      return canAll(config.permissions)
    }

    // Al menos uno de los permisos
    if (config.anyPermission && config.anyPermission.length > 0) {
      return canAny(config.anyPermission)
    }

    return true
  }

  /**
   * Filtrar acciones según permisos
   */
  const filterActionsByPermissions = (
    actions: Action[],
    permissionConfig: ActionPermissionConfig,
  ): Action[] => {
    return actions.filter((action) => {
      const config = permissionConfig[action.name]
      // Las acciones marcadas como `allowAll` no dependen de la sesión/rol
      // (este backend de asociaciones no siempre expone un rol activo).
      if (config?.allowAll) return true
      if (!isAuthenticated.value) return false
      return isActionAllowed(config)
    })
  }

  /**
   * Obtener acciones con verificación de permisos
   * @param item - Item de la tabla (para determinar estado activo/inactivo)
   * @param customActions - Acciones personalizadas (opcional)
   * @param permissionConfig - Configuración de permisos por acción
   */
  const getActionsWithPermissions = (
    item: any,
    customActions?: Action[],
    permissionConfig?: ActionPermissionConfig,
  ): Action[] => {
    const actions = customActions || getDefaultActions(item)
    const config = { ...defaultActionPermissions, ...permissionConfig }

    return filterActionsByPermissions(actions, config)
  }

  /**
   * Acciones por defecto para tablas
   */
  const getDefaultActions = (item: any): Action[] => [
    TABLE_ACTIONS.edit,
    {
      name: TABLE_ACTIONS.toggleStatus.name,
      icon: TABLE_ACTIONS.toggleStatus.icon,
      class: !item.active
        ? `${TABLE_ACTIONS.toggleStatus.class} bg-warning-100 border border-warning-500`
        : `${TABLE_ACTIONS.toggleStatus.class} bg-success-500 border border-success-500`,
      tooltip: !item.active ? 'activar' : 'desactivar',
    },
    TABLE_ACTIONS.delete,
  ]

  /**
   * Acciones seguras en caso de error (solo view)
   */
  const getDefaultSafeActions = (): Action[] => [TABLE_ACTIONS.edit]


  /**
   * Crear función de acciones personalizada para un módulo
   * @param modulePermissions - Objeto con permisos del módulo (ej: PERMISSIONS.company)
   * @param extraActions - Acciones adicionales a insertar al inicio de las acciones por defecto
   */
  const createModuleActions = (
    modulePermissions: {
      update?: string
      toggleStatus?: string
      delete?: string
    },
    extraActions: Action[] = [],
  ) => {
    return (item: any): Action[] => {
      const config: ActionPermissionConfig = {
        edit: modulePermissions.update
          ? { permission: modulePermissions.update }
          : { allowAll: true },
        toggleStatus: modulePermissions.toggleStatus
          ? { permission: modulePermissions.toggleStatus }
          : { allowAll: true },
        delete: modulePermissions.delete
          ? { permission: modulePermissions.delete }
          : { allowAll: true },
      }
      const defaultActions = getDefaultActions(item)
      const allActions = [...extraActions, ...defaultActions]
      return getActionsWithPermissions(item, allActions, config)
    }
  }

  return {
    // Función principal
    getActionsWithPermissions,


    // Utilidades
    getDefaultActions,
    getDefaultSafeActions,
    createModuleActions,
    filterActionsByPermissions,
    isActionAllowed,

    // Permisos (para referencia)
    PERMISSIONS,
  }
}
