<template>
  <div class="card-stack-container pb-4">
    <!-- Skeleton de carga (equivalente al skeleton del tbody en desktop) -->
    <div v-if="isTableLoading" class="flex flex-col gap-2">
      <div
        v-for="n in 3"
        :key="`card-skeleton-${n}`"
        class="border border-slate-200 rounded-2xl shadow-sm p-4 mb-4"
      >
        <div class="flex items-center justify-between gap-3">
          <div class="flex-1 space-y-2">
            <div class="skeleton-cell" style="width: 35%"></div>
            <div class="skeleton-cell" style="width: 65%; height: 1.1rem"></div>
          </div>
          <div class="skeleton-cell" style="width: 32px; height: 32px; border-radius: 10px"></div>
        </div>
      </div>
    </div>

    <!-- Estado vacío -->
    <div
      v-else-if="data.length === 0"
      class="text-center py-12 bg-white rounded-lg shadow-sm border"
    >
      <div
        class="flex flex-col items-center justify-center text-slate-500"
        style="min-height: 250px"
      >
        <Inbox class="text-slate-400 opacity-50 mb-4" :size="48" />
        <h5 class="font-semibold text-slate-500 mb-1">No hay datos para mostrar</h5>
        <p class="mb-0 text-sm opacity-75">Intenta ajustar tu búsqueda o agregar nuevos registros.</p>
      </div>
    </div>

    <!-- Lista de tarjetas en formato accordion -->
    <div v-else class="flex flex-col gap-2 custom-mobile-accordion" id="cardStackAccordion">
      <div
        v-for="item in data"
        :key="item.id"
        class="border border-slate-200 rounded-lg mb-4 border-0 shadow-sm rounded-2xl overflow-hidden"
      >
        <h2 class="p-4 cursor-pointer" :id="'heading-' + item.id">
          <div
            class="flex items-center justify-between w-full text-left font-medium bg-white text-slate-900 font-semibold"
            :class="{ collapsed: expandedItemId !== item.id }"
            @click="toggleAccordion(item)"
            style="cursor: pointer"
          >
            <!-- Mostrar el primer y segundo header en el boton del accordion -->
            <div
              class="flex w-full items-center gap-2 pr-1"
              v-if="displayableHeaders.length > 0"
            >
              <div
                class="flex flex-col items-start overflow-hidden"
                style="flex: 1; min-width: 0"
              >
                <span
                  class="text-slate-500 text-sm mb-1 truncate w-full text-left"
                  style="font-size: 0.75rem"
                  >{{ displayableHeaders[0].label }}</span
                >
                <div class="truncate font-bold w-full text-left">
                  <slot
                    :name="`cell(${displayableHeaders[0].key})`"
                    :item="item"
                    :value="getNestedValue(item, displayableHeaders[0].key)"
                  >
                    <template v-if="displayableHeaders[0].format">
                      {{ formatCell(getNestedValue(item, displayableHeaders[0].key), displayableHeaders[0]) }}
                    </template>
                    <template v-else-if="!disableAutoDateFormat && ['created_at', 'updated_at', 'deleted_at'].includes(displayableHeaders[0].key)">
                      <span v-if="getNestedValue(item, displayableHeaders[0].key) && getNestedValue(item, displayableHeaders[0].key) !== '-'" v-format-date-time="getNestedValue(item, displayableHeaders[0].key)"></span>
                      <span v-else>{{ displayableHeaders[0].empty ?? '-' }}</span>
                    </template>
                    <template v-else>
                      {{ formatCell(getNestedValue(item, displayableHeaders[0].key), displayableHeaders[0]) }}
                    </template>
                  </slot>
                </div>
              </div>
              <div
                class="flex flex-col items-start overflow-hidden"
                style="flex: 1; min-width: 0"
                v-if="displayableHeaders.length > 1 && !isFirstColumnTooLong(item)"
              >
                <span
                  class="text-slate-500 text-sm mb-1 truncate w-full text-left"
                  style="font-size: 0.75rem"
                  >{{ displayableHeaders[1].label }}</span
                >
                <div class="truncate w-full text-left">
                  <slot
                    :name="`cell(${displayableHeaders[1].key})`"
                    :item="item"
                    :value="getNestedValue(item, displayableHeaders[1].key)"
                  >
                    <template v-if="displayableHeaders[1].format">
                      {{ formatCell(getNestedValue(item, displayableHeaders[1].key), displayableHeaders[1]) }}
                    </template>
                    <template v-else-if="!disableAutoDateFormat && ['created_at', 'updated_at', 'deleted_at'].includes(displayableHeaders[1].key)">
                      <span v-if="getNestedValue(item, displayableHeaders[1].key) && getNestedValue(item, displayableHeaders[1].key) !== '-'" v-format-date-time="getNestedValue(item, displayableHeaders[1].key)"></span>
                      <span v-else>{{ displayableHeaders[1].empty ?? '-' }}</span>
                    </template>
                    <template v-else>
                      {{ formatCell(getNestedValue(item, displayableHeaders[1].key), displayableHeaders[1]) }}
                    </template>
                  </slot>
                </div>
              </div>
              <!-- Acciones se han movido a la burbuja flotante para mejor UX en móvil -->
              <div
                v-if="hasActions && getActionsForItem(item).length > 0"
                class="flex justify-end shrink-0 ml-1 items-center"
              >
                <!-- Acciones directas desde los tres puntos -->
                <button
                  type="button"
                  class="flex items-center justify-center rounded-lg border-0 px-3 py-1.5 text-sm bg-slate-100"
                  style="width: 32px; height: 32px"
                  @click.stop="openActions(item)"
                  title="Opciones"
                >
                  <MoreVertical class="text-sky-600" :size="16" />
                </button>
              </div>
            </div>
            <div v-else class="w-full pr-4 text-left">Item #{{ item.id }}</div>
          </div>
        </h2>

        <transition @enter="onEnter" @after-enter="onAfterEnter" @leave="onLeave">
          <div
            v-show="expandedItemId === item.id"
            :id="'collapse-' + item.id"
            class="p-4"
          >
            <div class="p-0">
              <div class="flex flex-col h-full">
                <div class="grow p-0 m-0">
                  <template v-for="(header, index) in displayableHeaders" :key="header.key">
                    <div
                      class="flex justify-between items-center border-b p-4 text-center"
                    >
                      <span class="font-bold text-slate-500 text-sm w-1/2 shrink-0 pr-2">{{
                        header.label
                      }}</span>
                      <div class="break-words w-1/2 flex justify-center items-center">
                        <slot
                          :name="`cell(${header.key})`"
                          :item="item"
                          :value="getNestedValue(item, header.key)"
                        >
                          <span class="block w-full text-right">
                            <template v-if="header.format">
                              {{ formatCell(getNestedValue(item, header.key), header) }}
                            </template>
                            <template v-else-if="!disableAutoDateFormat && ['created_at', 'updated_at', 'deleted_at'].includes(header.key)">
                              <span v-if="getNestedValue(item, header.key) && getNestedValue(item, header.key) !== '-'" v-format-date-time="getNestedValue(item, header.key)"></span>
                              <span v-else>{{ header.empty ?? '-' }}</span>
                            </template>
                            <template v-else>
                              {{ formatCell(getNestedValue(item, header.key), header) }}
                            </template>
                          </span>
                        </slot>
                      </div>
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </transition>
      </div>
    </div>

    <!-- Modal de Acciones -->
    <Modal id="actionsModal" ref="actionsModalRef" title="Acciones disponibles" size="md">
      <div v-if="activeItem" class="flex flex-col gap-4">
        <div class="flex flex-col gap-2">
          <button
            v-for="action in getActionsForItem(activeItem)"
            :key="`action-modal-${action.name}-${actionsItemId}`"
            @click="handleActionClick(action.name)"
            class="flex items-center gap-4 p-4 rounded-lg shadow-sm text-left action-btn-hover border-0 bg-slate-100"
          >
            <div
              :class="[
                action.class,
                'action-icon-wrap flex items-center justify-center',
              ]"
            >
              <component :is="getIconComponent(action.icon)" v-if="getIconComponent(action.icon)" :size="24" />
            </div>
            <div class="flex flex-col">
              <span class="font-bold text-slate-900" style="text-transform: capitalize">{{ action.tooltip || action.name }}</span>
              <span class="text-slate-500 extra-small" v-if="action.tooltip"
                >Realizar esta operación</span
              >
            </div>
          </button>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  Inbox, MoreVertical, Plus, Pencil, RefreshCw, Trash2, FileText,
  Calculator, LogIn, DollarSign, Eye, CheckCircle2, XCircle, Link2, ShoppingBag, Truck, type LucideIcon,
} from 'lucide-vue-next'
import Modal from '@/components/common/layout/Modal.vue'
import { useFormatCell } from '@/composables/table/useFormatCell'
import type { TableHeader } from '@/const/tableConst'

const { formatCell } = useFormatCell()

// Directiva local (sin registro global): formatea fechas ISO a DD/MM/YYYY HH:mm
// para las columnas created_at/updated_at/deleted_at.
const vFormatDateTime = {
  mounted(el: HTMLElement, binding: { value: unknown }) {
    el.textContent = formatDateTime(binding.value)
  },
  updated(el: HTMLElement, binding: { value: unknown }) {
    el.textContent = formatDateTime(binding.value)
  },
}

function formatDateTime(value: unknown): string {
  if (!value) return '-'
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

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
}

interface EntityItem {
  id: string | number
  [key: string]: any
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
  }>(),
  {
    disableAutoDateFormat: false,
  }
)

const emit = defineEmits<{

  (e: 'row-click', item: EntityItem): void
  (e: 'action-click', payload: { actionName: string; item: EntityItem }): void
}>()

// expandedItemId = acordeón abierto; actionsItemId = item del modal de
// acciones. Antes compartían la misma ref, así que abrir el menú ⋮ también
// expandía la tarjeta (efecto colateral) y emitía un row-click espurio.
const expandedItemId = ref<string | number | null>(null)
const actionsItemId = ref<string | number | null>(null)
const actionsModalRef = ref<InstanceType<typeof Modal> | null>(null)

const activeItem = computed(() => {
  if (actionsItemId.value === null || actionsItemId.value === undefined) return null
  return props.data.find((item: EntityItem) => item.id === actionsItemId.value) || null
})

// Si la página/datos cambian y el item del modal ya no existe, cerrarlo
// (evita un modal vacío o actuar sobre un item fantasma).
watch(
  () => props.data,
  () => {
    if (actionsItemId.value !== null && !activeItem.value) {
      actionsModalRef.value?.closeModal()
      actionsItemId.value = null
    }
  },
)

const displayableHeaders = computed(() => props.headers.filter((h) => h.key !== 'id'))

const isFirstColumnTooLong = (item: EntityItem): boolean => {
  if (displayableHeaders.value.length === 0) return false
  const val = props.getNestedValue(item, displayableHeaders.value[0].key)
  if (val === null || val === undefined) return false
  return String(val).length > 20
}

const openActions = (item: EntityItem) => {
  actionsItemId.value = item.id
  actionsModalRef.value?.openModal()
}

const handleActionClick = (actionName: string) => {
  const item = activeItem.value
  if (item) {
    emit('action-click', { actionName, item })
  }
  actionsItemId.value = null
  actionsModalRef.value?.closeModal()
}

// Animación del accordion
const onEnter = (el: Element) => {
  const htmlEl = el as HTMLElement
  htmlEl.style.height = '0'
  htmlEl.style.opacity = '0'
  htmlEl.style.overflow = 'hidden'
  htmlEl.offsetHeight // force reflow
  htmlEl.style.transition = 'height 0.5s ease, opacity 0.5s ease'
  htmlEl.style.height = htmlEl.scrollHeight + 'px'
  htmlEl.style.opacity = '1'
}

const onAfterEnter = (el: Element) => {
  const htmlEl = el as HTMLElement
  htmlEl.style.height = 'auto'
  htmlEl.style.overflow = 'visible'
}

const onLeave = (el: Element) => {
  const htmlEl = el as HTMLElement
  htmlEl.style.height = htmlEl.scrollHeight + 'px'
  htmlEl.style.overflow = 'hidden'
  htmlEl.style.opacity = '1'
  htmlEl.offsetHeight // force reflow
  htmlEl.style.transition = 'height 0.5s ease, opacity 0.5s ease'
  htmlEl.style.height = '0'
  htmlEl.style.opacity = '0'
}

const toggleAccordion = (item: EntityItem) => {
  if (expandedItemId.value === item.id) {
    expandedItemId.value = null
  } else {
    expandedItemId.value = item.id
  }
  emit('row-click', item)
}
</script>

<style scoped>
.custom-mobile-accordion {
  width: 100%;
}

:deep(.truncate *) {
  margin-bottom: 0 !important;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Modal Actions Styles ── */
.action-btn-hover {
  transition: all 0.2s ease;
  background: white !important;
}

.action-btn-hover:active {
  transform: scale(0.98);
  background: #f8fafc !important;
}

.action-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 0.5rem;
  flex-shrink: 0;
}

.extra-small {
  font-size: 0.7rem;
}

/* Skeleton de carga (equivalente a las filas skeleton del tbody en desktop) */
.skeleton-cell {
  height: 0.875rem;
  border-radius: 4px;
  background-color: rgba(0, 0, 0, 0.08);
  animation: pulse 1.6s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
