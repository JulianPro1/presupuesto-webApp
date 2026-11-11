<template>
  <tbody v-if="isTableLoading" class="skeleton-body">
    <tr
      v-for="n in skeletonRows"
      :key="`skeleton-${n}`"
      class="skeleton-row"
    >
      <td
        v-for="header in headers"
        :key="header.key"
        class="text-left px-6 py-4"
      >
        <div
          class="skeleton-cell"
          :style="{ width: `${40 + ((n + header.key.length) % 5) * 12}%` }"
        ></div>
      </td>
      <td
        v-if="hasActions"
        class="text-left px-6 py-3 whitespace-nowrap"
      >
        <div class="flex gap-2">
          <div class="skeleton-action"></div>
          <div class="skeleton-action"></div>
        </div>
      </td>
    </tr>
  </tbody>
  <TransitionGroup v-else :name="rowAnimation" tag="tbody" class="divide-y divide-slate-100" appear>
    <tr v-if="data.length === 0" :key="'empty'">
      <td :colspan="headers.length + (hasActions ? 1 : 0)" class="text-center py-12">
        <div
          class="flex flex-col items-center justify-center text-slate-500"
          style="min-height: 250px"
        >
          <Inbox class="text-slate-400 opacity-50 mb-4" :size="48" />
          <h5 class="font-semibold text-slate-500 mb-1">No hay datos para mostrar</h5>
          <p class="mb-0 text-sm opacity-75">
            Intenta ajustar tu búsqueda o agregar nuevos registros.
          </p>
        </div>
      </td>
    </tr>

    <tr
      v-for="(row, index) in processedRows"
      :key="row.item.id"
      :class="[
        'crud-row',
        row.item._ui?.action ? `row-${row.item._ui.action}` : '',
        row.item._ui?.status ? `row-${row.item._ui.status}` : '',
      ]"
      :style="{ transitionDelay: `${Math.min(index, 5) * 15}ms` }"
      @click="$emit('row-click', row.item)">
      <td
        v-for="header in headers"
        :key="header.key"
        class="px-6 py-4 whitespace-nowrap"
      >
        <slot :name="`cell(${header.key})`" :item="row.item" :value="row.cellValues[header.key]">
          <template v-if="header.key === 'active'">
            <StatusBadge :value="row.cellValues[header.key]" />
          </template>
          <template v-else>
            {{ formatCell(row.cellValues[header.key], header) }}
          </template>
        </slot>
      </td>

      <td
        v-if="hasActions"
        class="px-6 py-3 whitespace-nowrap"
      >
        <div class="flex gap-2">
          <button
            v-for="action in row.actions"
            :key="`action-${action.name}-${row.item.id}`"
            :class="[action.label ? 'action-btn action-btn--labeled' : 'action-btn', action.class]"
            @click.stop="$emit('action-click', { actionName: action.name, item: row.item })"
            :data-title="action.tooltip"
            data-tooltip-pos="bottom"
          >
            <component :is="getIconComponent(action.icon)" v-if="getIconComponent(action.icon)" :size="16" />
            <span v-if="action.label">{{ action.label }}</span>
          </button>
        </div>
      </td>
    </tr>
  </TransitionGroup>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  Inbox, Plus, Pencil, RefreshCw, Trash2, FileText, Calculator,
  LogIn, DollarSign, Eye, CheckCircle2, XCircle, Link2, ShoppingBag, Truck, type LucideIcon,
} from 'lucide-vue-next'
import StatusBadge from '@/components/common/badges/StatusBadge.vue'
import { useFormatCell } from '@/composables/table/useFormatCell'
import { TABLE_PAGINATION, type TableHeader } from '@/const/tableConst'

const iconMap: Record<string, LucideIcon> = {
  'plus': Plus,
  'pencil': Pencil,
  'refresh-cw': RefreshCw,
  'trash': Trash2,
  'file-text': FileText,
  'calculator': Calculator,
  'log-in': LogIn,
  'dollar-sign': DollarSign,
  'eye': Eye,
  'check-circle': CheckCircle2,
  'x-circle': XCircle,
  'link': Link2,
  'shopping-bag': ShoppingBag,
  'truck': Truck,
  'bi bi-plus': Plus,
  'bi bi-plus-lg': Plus,
  'bi bi-pencil': Pencil,
  'bi bi-pencil-fill': Pencil,
  'bi bi-arrow-repeat': RefreshCw,
  'bi bi-trash': Trash2,
  'bi bi-trash-fill': Trash2,
  'bi bi-trash2': Trash2,
  'bi bi-trash3': Trash2,
  'bi bi-file-text': FileText,
  'bi bi-eye': Eye,
  'bi bi-calculator': Calculator,
  'bi bi-box-arrow-in-left': LogIn,
  'bi bi-cash': DollarSign,
  'bi bi-currency-dollar': DollarSign,
  'bi bi-check-circle': CheckCircle2,
  'bi bi-check-circle-fill': CheckCircle2,
  'bi bi-x-circle': XCircle,
  'bi bi-x-circle-fill': XCircle,
  'bi bi-link-45deg': Link2,
}

const getIconComponent = (iconClass: string): LucideIcon | null => {
  return iconMap[iconClass] || null
}

type Header = TableHeader

interface Action {
  name: string
  icon: string
  class: string
  tooltip?: string
  /** Si está presente, renderiza un botón con label en vez de solo icono */
  label?: string
}

interface EntityItem {
  id: string | number
  [key: string]: any
}

interface ProcessedRow {
  item: EntityItem
  cellValues: Record<string, any>
  actions: Action[]
}

const props = withDefaults(
  defineProps<{
    data: EntityItem[]
    headers: Header[]
    hasActions: boolean
    isTableLoading: boolean
    getActionsForItem: (item: EntityItem) => Action[]
    getNestedValue: (obj: any, key: string) => any
    disableAutoDateFormat?: boolean
    rowAnimation?: 'slide-fade' | 'pop-in' | 'flip-in'
    perPage?: number
  }>(),
  {
    disableAutoDateFormat: false,
    rowAnimation: 'pop-in',
    perPage: TABLE_PAGINATION.limit,
  }
)

const { formatCell } = useFormatCell()

// Cap al skeleton: con perPage=100 no tiene sentido montar 100 filas falsas.
const skeletonRows = computed(() => Math.min(props.perPage || 5, 15))

const processedRows = computed<ProcessedRow[]>(() =>
  props.data.map((item) => {
    const cellValues: Record<string, any> = {}
    for (const header of props.headers) {
      cellValues[header.key] = props.getNestedValue(item, header.key)
    }
    return {
      item,
      cellValues,
      actions: props.getActionsForItem(item),
    }
  })
)

defineEmits<{
  (e: 'row-click', item: EntityItem): void
  (e: 'action-click', payload: { actionName: string; item: EntityItem }): void
}>()
</script>

<style scoped>
td {
  vertical-align: middle;
  transition: background-color 0.8s ease, border-left-color 0.8s ease, opacity 0.3s ease;
}

tr {
  position: relative;
  z-index: 1;
  transform-origin: top center;
}

tr:hover {
  z-index: 10;
  background-color: rgba(248, 250, 252, 0.8) !important;
}

button[data-title]:hover {
  position: relative;
  z-index: 100;
}

/* --- Action buttons --- */
.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 0.5rem;
  border: none;
  background: #f1f5f9;
  cursor: pointer;
  transition: all 0.15s ease;
  color: #64748b;
}
.action-btn:hover {
  background: #e2e8f0;
  transform: translateY(-1px);
}

.action-btn--labeled {
  width: auto;
  height: auto;
  padding: 6px 14px;
  border-radius: 0.5rem;
  font-size: 12px;
  font-weight: 700;
  gap: 6px;
  border: 1px solid #fbcfe8;
  color: #be185d;
  background: #fdf2f8;
  transition: all 0.15s ease;
}
.action-btn--labeled:hover {
  background: #fce7f3;
  border-color: #f9a8d4;
  transform: translateY(-1px);
}

.skeleton-row td {
  cursor: default;
}
.skeleton-cell {
  height: 0.875rem;
  border-radius: 4px;
  background-color: rgba(0, 0, 0, 0.08);
  animation: pulse 1.6s ease-in-out infinite;
}
.skeleton-action {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background-color: rgba(0, 0, 0, 0.08);
  animation: pulse 1.6s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Slide & Fade */
.slide-fade-enter-active,
.slide-fade-leave-active,
.slide-fade-move {
  transition: opacity 0.25s ease;
}
.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
}

/* Pop In */
.pop-in-enter-active,
.pop-in-leave-active,
.pop-in-move {
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.pop-in-enter-from,
.pop-in-leave-to {
  opacity: 0;
  transform: scale(0.98);
}

/* Flip In */
.flip-in-enter-active,
.flip-in-leave-active,
.flip-in-move {
  transition: all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.flip-in-enter-from,
.flip-in-leave-to {
  opacity: 0;
  transform: perspective(800px) rotateX(-10deg);
}

/* CRUD row feedback */
.row-pending td {
  opacity: 0.75;
  pointer-events: none;
  background-color: rgba(180, 155, 87, 0.12) !important;
}

.row-success td {
  background-color: rgba(40, 125, 71, 0.07) !important;
}

.row-create td {
  background-color: rgba(40, 125, 71, 0.10) !important;
  animation: row-create 1.4s ease;
}

.row-update td {
  background-color: rgba(217, 119, 6, 0.10) !important;
  animation: row-update 2s ease;
}

.row-toggle td {
  background-color: rgba(251, 176, 52, 0.10) !important;
  animation: row-toggle 1.6s ease;
}

.row-delete td {
  background-color: rgba(183, 28, 28, 0.10) !important;
  animation: row-delete 0.7s ease forwards;
}

.row-pending td:first-child,
.row-success td:first-child,
.row-create td:first-child,
.row-update td:first-child,
.row-toggle td:first-child,
.row-delete td:first-child {
  border-left: 4px solid;
}

.row-pending td:first-child { border-left-color: rgba(180, 155, 87, 0.55); }
.row-success td:first-child { border-left-color: rgba(40, 125, 71, 0.6); }
.row-create td:first-child { border-left-color: rgba(40, 125, 71, 0.85); }
.row-update td:first-child { border-left-color: rgba(217, 119, 6, 0.85); }
.row-toggle td:first-child { border-left-color: rgba(251, 176, 52, 0.85); }
.row-delete td:first-child { border-left-color: rgba(183, 28, 28, 0.85); }

@keyframes row-create {
  0% { opacity: 0; background-color: rgba(40, 125, 71, 0.35); }
  50% { background-color: rgba(40, 125, 71, 0.22); }
  100% { background-color: rgba(40, 125, 71, 0.10); }
}

@keyframes row-update {
  0% { background-color: rgba(217, 119, 6, 0.35); }
  60% { background-color: rgba(217, 119, 6, 0.18); }
  100% { background-color: rgba(217, 119, 6, 0.10); }
}

@keyframes row-toggle {
  0% { background-color: rgba(251, 176, 52, 0.30); }
  55% { background-color: rgba(251, 176, 52, 0.15); }
  100% { background-color: rgba(251, 176, 52, 0.10); }
}

@keyframes row-delete {
  0% { opacity: 1; transform: translateX(0); background-color: rgba(183, 28, 28, 0.30); }
  100% { opacity: 0; transform: translateX(-30px); background-color: rgba(183, 28, 28, 0.10); }
}
</style>
