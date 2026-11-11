<template>
  <div class="flex flex-col w-full">

            <!-- Paginación -->
    <div class="block md:hidden">
      <TablePagination
        :current-page="currentPage"
        :total-pages="totalPages"
        :pages-to-show="pagesToShow"
        :show-left-ellipsis="showLeftEllipsis"
        :show-right-ellipsis="showRightEllipsis"
        :show-first-page="showFirstPage"
        :show-last-page="showLastPage"
        :hide-pagination="hidePagination"
        :per-page="perPage"
        :total="total"
        :page-size-options="pageSizeOptions"
        @change-page="changePage"
        @change-per-page="changePerPage"
      />
    </div>

    <div
      class="content_table relative border-radius-left border-radius-right"
    >
      <!-- Versión Desktop: Tabla Original -->
      <div class="hidden md:block">
        <table class="w-full">
          <!-- Encabezado -->
          <TableHeader :headers="headers" :has-actions="hasActions" />

          <!-- Cuerpo -->
          <TableBody
            :data="data"
            :headers="headers"
            :has-actions="hasActions"
            :is-table-loading="isTableLoading"
            :get-actions-for-item="getActionsForItem"
            :get-nested-value="getNestedValue"
            :disable-auto-date-format="disableAutoDateFormat"
            :row-animation="displayedRowAnimation"
            :per-page="perPage"
            @row-click="(item) => $emit('row-click', item)"
            @action-click="(payload) => $emit('action-click', payload)"
          >
            <!-- Reenvío de slots de celda al consumidor -->
            <template v-for="(_, name) in $slots" #[name]="slotProps">
              <slot :name="name" v-bind="slotProps ?? {}" />
            </template>
          </TableBody>
        </table>
      </div>

      <!-- Versión Móvil: Card Stack -->
      <div class="block md:hidden">
        <CardStack
          :data="data"
          :headers="headers"
          :has-actions="hasActions"
          :is-table-loading="isTableLoading"
          :get-actions-for-item="getActionsForItem"
          :get-nested-value="getNestedValue"
          :disable-auto-date-format="disableAutoDateFormat"
          @row-click="(item) => $emit('row-click', item)"
          @action-click="(payload) => $emit('action-click', payload)"
        >
          <!-- Reenvío de slots de celda al consumidor -->
          <template v-for="(_, name) in $slots" #[name]="slotProps">
            <slot :name="name" v-bind="slotProps ?? {}" />
          </template>
        </CardStack>
      </div>
    </div>

    <!-- Paginación -->
    <div>
      <TablePagination
        :current-page="currentPage"
        :total-pages="totalPages"
        :pages-to-show="pagesToShow"
        :show-left-ellipsis="showLeftEllipsis"
        :show-right-ellipsis="showRightEllipsis"
        :show-first-page="showFirstPage"
        :show-last-page="showLastPage"
        :hide-pagination="hidePagination"
        :per-page="perPage"
        :total="total"
        :page-size-options="pageSizeOptions"
        @change-page="changePage"
        @change-per-page="changePerPage"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, toRefs, ref, watch } from 'vue'
import TableHeader from './CustomTable/TableHeader.vue'
import TableBody from './CustomTable/TableBody.vue'
import TablePagination from './CustomTable/TablePagination.vue'
import CardStack from './CustomTable/CardStack.vue'
import { TABLE_PAGINATION, type TableHeader as TableHeaderDef } from '@/const/tableConst'

// --- Type Definitions (Interfaces) ---

// TableHeader (key/label/format/empty) vive en @/const/tableConst — la misma
// forma que usan las constantes TABLE_HEADERS de cada vista.
type Header = TableHeaderDef

interface Action {
  name: string
  icon: string
  class: string
  tooltip?: string
  /** Si está presente, renderiza un botón con label en vez de solo icono */
  label?: string
}

interface EntityItem {
  // Item -> EntityItem
  id: string | number
  [key: string]: any
}

// --- Component Props ---

const props = withDefaults(
  defineProps<{
    data: EntityItem[] // Item[] -> EntityItem[]
    headers: Header[]
    actions?:
      | Action[]
      | ((item: EntityItem) => Action[])
      | ((item: EntityItem) => Promise<Action[]>)
    currentPage?: number
    totalPages?: number
    perPage?: number
    total?: number
    maxPagesToShow?: number
    isLoading?: boolean
    hidePagination?: boolean
    disableAutoDateFormat?: boolean
    showActions?: boolean
    pageSizeOptions?: number[]
    rowAnimation?: 'slide-fade' | 'pop-in' | 'flip-in'
    pageAnimation?: 'slide-fade' | 'pop-in' | 'flip-in'
  }>(),
  {
    headers: () => [],
    actions: undefined,
    currentPage: TABLE_PAGINATION.currentPage,
    totalPages: TABLE_PAGINATION.totalPages,
    perPage: TABLE_PAGINATION.limit,
    total: undefined,
    maxPagesToShow: 5,
    isLoading: false,
    hidePagination: false,
    disableAutoDateFormat: false,
    showActions: true,
    pageSizeOptions: () => TABLE_PAGINATION.pageSizeOptions,
    rowAnimation: 'pop-in',
    pageAnimation: 'slide-fade',
  },
)

// Estado reactivo para manejar acciones asíncronas
const itemActions = ref<Record<string | number, Action[]>>({})
const loadingActions = ref<Record<string | number, boolean>>({})

// Loading solo por datos: las acciones async se resuelven en segundo plano
// por celda (sin forzar skeleton de toda la tabla).
const isTableLoading = computed(() => props.isLoading)

// Animación de filas: fade suave al paginar, configurada en carga inicial
const isPaginating = ref(false)
const displayedRowAnimation = computed(() =>
  isPaginating.value ? props.pageAnimation : props.rowAnimation
)

watch(() => props.currentPage, () => {
  isPaginating.value = true
})

// Resetear al llegar la nueva página: por referencia, por length (mutación
// in-place) y al terminar la carga (fallback si data reutiliza la misma ref).
watch([() => props.data, () => props.data.length], () => {
  isPaginating.value = false
})

watch(() => props.isLoading, (loading) => {
  if (!loading) isPaginating.value = false
})

// --- Emits ---

const emit = defineEmits<{
  (e: 'change-page', page: number): void
  (e: 'change-per-page', perPage: number): void
  (e: 'action-click', payload: { actionName: string; item: EntityItem }): void // Item -> EntityItem
  (e: 'row-click', item: EntityItem): void // Item -> EntityItem
}>()

// --- Lógica de Paginación ---

const { currentPage, totalPages, perPage, total, maxPagesToShow } = toRefs(props)

const pagesToShow = computed(() => {
  const pages: number[] = []
  const half = Math.floor(maxPagesToShow.value / 2)
  let startPage = Math.max(1, currentPage.value - half)
  let endPage = Math.min(totalPages.value, startPage + maxPagesToShow.value - 1)

  // Ajustar si llegamos al final
  if (endPage - startPage < maxPagesToShow.value - 1) {
    startPage = Math.max(1, endPage - maxPagesToShow.value + 1)
  }

  // Excluir la primera y última página (se renderizan por separado)
  const firstToShow = totalPages.value > maxPagesToShow.value ? Math.max(2, startPage) : startPage
  const lastToShow =
    totalPages.value > maxPagesToShow.value ? Math.min(totalPages.value - 1, endPage) : endPage

  for (let i = firstToShow; i <= lastToShow; i++) {
    pages.push(i)
  }
  return pages
})

// Mostrar página 1 como botón separado si no está en la ventana
const showFirstPage = computed(() => totalPages.value > maxPagesToShow.value)

// Mostrar última página como botón separado si no está en la ventana
const showLastPage = computed(() => totalPages.value > maxPagesToShow.value)

// Elipsis izquierda: hay páginas ocultas entre la página 1 y la ventana visible
const showLeftEllipsis = computed(() => {
  return showFirstPage.value && pagesToShow.value.length > 0 && pagesToShow.value[0] > 2
})

// Elipsis derecha: hay páginas ocultas entre la ventana y la última página
const showRightEllipsis = computed(() => {
  return (
    showLastPage.value &&
    pagesToShow.value.length > 0 &&
    pagesToShow.value[pagesToShow.value.length - 1] < totalPages.value - 1
  )
})

const changePage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    emit('change-page', page)
  }
}

const changePerPage = (newPerPage: number) => {
  emit('change-per-page', newPerPage)
  // Cambiar el tamaño de página invalida la página actual: volver a la 1
  // (el padre decide si refetchea; sin esto la tabla queda fuera de rango).
  if (currentPage.value !== 1) emit('change-page', 1)
}

// --- Funciones de Utilidad ---

const getNestedValue = (obj: any, key: string): any => {
  return key.split('.').reduce((acc, part) => acc?.[part], obj) ?? '-'
}

const getActionsForItem = (item: EntityItem): Action[] => {
  if (!props.showActions || !item) return []

  const actionsResolver = props.actions

  if (typeof actionsResolver === 'function') {
    // Si ya tenemos las acciones calculadas, las retornamos
    if (itemActions.value[item.id] && !loadingActions.value[item.id]) {
      return itemActions.value[item.id]
    }

    // Si ya está cargando, retornar array vacío
    if (loadingActions.value[item.id]) {
      return itemActions.value[item.id] || []
    }

    // CAMBIO IMPORTANTE: Usar try-catch y Promise.resolve
    try {
      const result = actionsResolver(item)

      // Detectar Promise de manera más robusta
      if (result instanceof Promise || (result && typeof (result as any).then === 'function')) {
        // Marcar como cargando INMEDIATAMENTE
        loadingActions.value[item.id] = true
        itemActions.value[item.id] = []

        // Convertir a Promise si no lo es ya
        Promise.resolve(result)
          .then((actions) => {
            itemActions.value[item.id] = actions || []
            loadingActions.value[item.id] = false
          })
          .catch((error) => {
            console.error('Error cargando acciones para item:', item.id, error)
            itemActions.value[item.id] = []
            loadingActions.value[item.id] = false
          })

        return []
      }

      // Si es síncrona, retornar directamente
      return result || []
    } catch (error) {
      console.error('Error executing actions function for item:', item.id, error)
      return []
    }
  }

  return Array.isArray(props.actions) ? props.actions : []
}

// La columna "Acciones" existe cuando hay un resolver configurado y datos.
// No evaluamos el resolver por fila aquí (efecto colateral + O(n) por render);
// las filas sin acciones simplemente muestran la celda vacía.
const hasActions = computed(() => {
  if (!props.showActions) return false
  if (props.data.length === 0) return false
  if (typeof props.actions === 'function') return true
  return Array.isArray(props.actions) ? props.actions.length > 0 : false
})

// Limpiar acciones cacheadas cuando cambia la lista (por referencia — el watch
// deep anterior rompía el feedback _ui de las filas al invalidar el cache).
watch(
  () => props.data,
  () => {
    itemActions.value = {}
    loadingActions.value = {}
  },
)
</script>

<style scoped>
/* Los estilos se pueden mantener, son genéricos y funcionales */
.img-fit {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 40px;
  width: 40px;
}
.img-fit img {
  border-radius: 6px;
  object-fit: cover;
  width: 100%;
  height: 100%;
}
td {
  vertical-align: middle;
}
.content_table {
  overflow-y: auto;
  overflow-x: auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
}

/* En desktop el contenedor tiene altura acotada: esto activa el scroll
   interno y, con él, el header sticky del thead (antes nunca scrolleaba
   porque height:100% de un padre sin altura fija no limitaba nada). */
@media (min-width: 768px) {
  .content_table {
    max-height: 75vh;
    max-height: 75dvh;
  }
}
.content_table::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.content_table::-webkit-scrollbar-thumb {
  background: rgba(134, 134, 134, 0.205);
  border-radius: 3px;
}
.content_table::-webkit-scrollbar-track {
  background: transparent;
}

.loader-fade-enter-active,
.loader-fade-leave-active {
  transition: opacity 0.3s ease;
}
.loader-fade-enter-from,
.loader-fade-leave-to {
  opacity: 0;
}
</style>

<!--

Este bloque de código muestra cómo se utiliza un componente reutilizable llamado `<DataTable>` en Vue. Se divide en tres conceptos clave:

---

### 1. Pasar Datos (Props) ⬇️

Las líneas que empiezan con dos puntos (`:`) son **props**. Sirven para pasar datos desde el componente padre hacia el componente `DataTable`.

* `:data="paginatedProducts"`: Le entrega la lista de ítems a mostrar en la tabla.
* `:headers="productHeaders"`: Le pasa la configuración de las columnas.
* `:is-loading="isLoading"`: Le indica a la tabla si debe mostrar el spinner de carga.

---

### 2. Reaccionar a Eventos (Listeners) ⬆️

Las líneas que empiezan con una arroba (`@`) son **listeners de eventos**. Permiten que el componente padre reaccione cuando algo sucede dentro de la tabla.

* `@change-page="handlePageChange"`: Cuando el usuario hace clic en un botón de paginación dentro de la tabla, se ejecuta el método `handlePageChange` del padre.
* `@action-click="handleAction"`: Cuando se hace clic en un botón de acción (ej. editar, borrar), se ejecuta el método `handleAction`.

---

### 3. Personalizar el Contenido (Slots) 🎨

Las etiquetas `<template #...>` definen **slots**. Permiten inyectar HTML personalizado desde el componente padre en lugares específicos del componente hijo, en este caso, para renderizar celdas de una manera especial.

* `<template #cell(price)="{ value }">`: Reemplaza el contenido de cualquier celda en la columna `price`.
* `{ value }` te da acceso al dato original de la celda para que puedas formatearlo, como en este caso, añadiéndole un símbolo de `$` y color verde.
* `<template #cell(stock)="{ value }">`: Hace lo mismo para la columna `stock`, mostrando un "badge" de "En Stock" o "Agotado" según el valor.

--- EJEMPLO DE USO ---

<template>
  <div style="padding: 2rem;">
    <h1>Lista de Productos 📦</h1>

    <DataTable
      :data="paginatedProducts"
      :headers="productHeaders"
      :actions="productActions"
      :is-loading="isLoading"
      :current-page="currentPage"
      :total-pages="totalPages"
      @change-page="handlePageChange"
      @action-click="handleAction"
    >
      <template #cell(price)="{ value }">
        <span style="font-weight: bold; color: green;">${{ value.toFixed(2) }}</span>
      </template>

      <template #cell(stock)="{ value }">
        <span :class="value > 0 ? 'badge bg-success' : 'badge bg-danger'">
          {{ value > 0 ? 'En Stock' : 'Agotado' }}
        </span>
      </template>

    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import DataTable from './DataTable.vue'; // 1. Importa tu componente

// --- ESTADO DEL COMPONENTE PADRE ---

const isLoading = ref(false);
const currentPage = ref(1);
const itemsPerPage = ref(5); // Define el límite de ítems por página

// 2. Define los encabezados de la tabla
const productHeaders = [
  { key: 'name', label: 'Producto' },
  { key: 'price', label: 'Precio' },
  { key: 'stock', label: 'Disponibilidad' },
];

// 3. Define las acciones para cada fila
const productActions = [
  { name: 'edit', icon: 'bi-pencil-fill', class: 'btn btn-sm btn-outline-primary', tooltip: 'Editar' },
  { name: 'delete', icon: 'bi-trash-fill', class: 'btn btn-sm btn-outline-danger', tooltip: 'Eliminar' },
];

// 4. Proporciona los datos (en una app real, esto vendría de una API)
const allProducts = ref([
  { id: 1, name: 'Laptop Pro', price: 1200.50, stock: 15 },
  { id: 2, name: 'Mouse Inalámbrico', price: 25.00, stock: 30 },
  { id: 3, name: 'Teclado Mecánico', price: 89.99, stock: 8 },
  { id: 4, name: 'Monitor 4K', price: 450.00, stock: 0 },
  { id: 5, name: 'Webcam HD', price: 55.00, stock: 22 },
  { id: 6, name: 'Auriculares Gamer', price: 78.50, stock: 12 },
  { id: 7, name: 'Silla Ergonómica', price: 250.00, stock: 5 },
  { id: 8, name: 'Micrófono de Estudio', price: 110.00, stock: 0 },
  { id: 9, name: 'Disco Duro SSD 1TB', price: 99.99, stock: 40 },
  { id: 10, name: 'Impresora Multifuncional', price: 150.00, stock: 7 },
]);

// --- LÓGICA DE PAGINACIÓN ---

// Calcula el número total de páginas basado en los datos y el límite
const totalPages = computed(() => {
  return Math.ceil(allProducts.value.length / itemsPerPage.value);
});

// "Corta" el array de datos para mostrar solo los de la página actual
const paginatedProducts = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return allProducts.value.slice(start, end);
});

// --- MANEJO DE EVENTOS ---

// 5. Escucha el evento 'change-page' y actualiza la página actual
const handlePageChange = (page: number) => {
  currentPage.value = page;
};

// 6. Escucha el evento 'action-click' y decide qué hacer
const handleAction = ({ actionName, item }) => {
  alert(`Acción: '${actionName}' en el producto: '${item.name}'`);
  // Aquí puedes abrir un modal, llamar a una API, etc.
};
</script>

<style>
/* Los íconos ahora se importan desde lucide-vue-next */
</style>
-->
