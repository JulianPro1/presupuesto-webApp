<template>
  <div v-if="totalPages >= 1 && !hidePagination" class="pagination-wrapper">
    <!-- Info: Página X de Y y total de registros -->
    <div class="pagination-meta hidden md:flex items-center gap-2">
      <span class="pagination-info">
        Página <strong>{{ currentPage }}</strong> de <strong>{{ totalPages }}</strong>
      </span>
      <span v-if="total != null" class="pagination-total">
        ({{ total }} registros)
      </span>
    </div>

    <!-- Selector de registros por página -->
    <div v-if="perPage != null" class="pagination-size flex items-center gap-1">
      <span class="pagination-size-label">Mostrar</span>
      <MultiselectCustom
        :model-value="perPage"
        :options="pageSizeOptions"
        :multiple="false"
        :show-icons="false"
        :show-descriptions="false"
        :clearable="false"
        :searchable="false"
        placeholder=""
        @update:model-value="$emit('change-per-page', Number($event))"
      />
    </div>

    <nav aria-label="Navegación de páginas">
      <ul class="pagination-list">
        <!-- ← Primera página -->
        <li v-if="showFirstPage">
          <button
            class="page-btn page-btn--nav"
            :class="{ disabled: currentPage <= 1 }"
            :disabled="currentPage <= 1"
            aria-label="Primera página"
            @click="$emit('change-page', 1)"
          >
            <ChevronsLeft :size="16" />
          </button>
        </li>

        <!-- ← Anterior -->
        <li>
          <button
            class="page-btn page-btn--nav"
            :class="{ disabled: currentPage <= 1 }"
            :disabled="currentPage <= 1"
            aria-label="Página anterior"
            @click="$emit('change-page', currentPage - 1)"
          >
            <ChevronLeft :size="16" />
          </button>
        </li>

        <!-- Página 1 fija (cuando hay elipsis izquierda) -->
        <li v-if="showFirstPage">
          <button
            class="page-btn"
            :class="{ 'page-btn--active': currentPage === 1 }"
            @click="$emit('change-page', 1)"
          >
            1
          </button>
        </li>

        <!-- Elipsis izquierda -->
        <li v-if="showLeftEllipsis" class="page-ellipsis" aria-hidden="true">
          <span>…</span>
        </li>

        <!-- Ventana de páginas centrales -->
        <li v-for="page in pagesToShow" :key="page">
          <button
            class="page-btn"
            :class="{ 'page-btn--active': page === currentPage }"
            :aria-current="page === currentPage ? 'page' : undefined"
            @click="$emit('change-page', page)"
          >
            {{ page }}
          </button>
        </li>

        <!-- Elipsis derecha -->
        <li v-if="showRightEllipsis" class="page-ellipsis" aria-hidden="true">
          <span>…</span>
        </li>

        <!-- Última página fija -->
        <li v-if="showLastPage">
          <button
            class="page-btn"
            :class="{ 'page-btn--active': currentPage === totalPages }"
            @click="$emit('change-page', totalPages)"
          >
            {{ totalPages }}
          </button>
        </li>

        <!-- → Siguiente -->
        <li>
          <button
            class="page-btn page-btn--nav"
            :class="{ disabled: currentPage >= totalPages }"
            :disabled="currentPage >= totalPages"
            aria-label="Página siguiente"
            @click="$emit('change-page', currentPage + 1)"
          >
            <ChevronRight :size="16" />
          </button>
        </li>

        <!-- → Última página -->
        <li v-if="showLastPage">
          <button
            class="page-btn page-btn--nav"
            :class="{ disabled: currentPage >= totalPages }"
            :disabled="currentPage >= totalPages"
            aria-label="Última página"
            @click="$emit('change-page', totalPages)"
          >
            <ChevronsRight :size="16" />
          </button>
        </li>
      </ul>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-vue-next'
import MultiselectCustom from '@/components/MultiselectCustom.vue'
import { TABLE_PAGINATION } from '@/const/tableConst'

const props = withDefaults(
  defineProps<{
    currentPage: number
    totalPages: number
    pagesToShow: number[]
    showLeftEllipsis: boolean
    showRightEllipsis: boolean
    showFirstPage: boolean
    showLastPage: boolean
    hidePagination: boolean
    perPage?: number
    total?: number
    pageSizeOptions?: number[]
  }>(),
  {
    perPage: undefined,
    total: undefined,
    pageSizeOptions: () => TABLE_PAGINATION.pageSizeOptions,
  },
)

defineEmits<{
  (e: 'change-page', page: number): void
  (e: 'change-per-page', perPage: number): void
}>()
</script>

<style scoped>
.pagination-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  flex-wrap: wrap;
}

.pagination-info {
  font-size: 0.8rem;
  color: #6c757d;
  white-space: nowrap;
  letter-spacing: 0.01em;
}

.pagination-info strong {
  color: #212529;
}

/* Lista de botones */
.pagination-list {
  display: flex;
  align-items: center;
  gap: 4px;
  list-style: none;
  margin: 0;
  padding: 0;
}

/* Botón base */
.page-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 34px;
  height: 34px;
  padding: 0 8px;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  background: #fff;
  color: #495057;
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease,
    transform 0.1s ease,
    box-shadow 0.15s ease;
  user-select: none;
  line-height: 1;
}

.page-btn:hover:not(.disabled):not(.page-btn--active) {
  background: #f1f3f5;
  border-color: #adb5bd;
  color: #212529;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.page-btn:active:not(.disabled) {
  transform: translateY(0);
  box-shadow: none;
}

/* Página activa */
.page-btn--active {
  background: #212529;
  border-color: #212529;
  color: #fff;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(33, 37, 41, 0.25);
  cursor: default;
  pointer-events: none;
}

/* Botones de navegación (prev/next/first/last) */
.page-btn--nav {
  color: #6c757d;
  font-size: 0.75rem;
}

.page-btn--nav:hover:not(.disabled) {
  color: #212529;
}

/* Estado deshabilitado */
.page-btn.disabled,
.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
  transform: none;
  box-shadow: none;
}

/* Elipsis */
.page-ellipsis {
  display: flex;
  align-items: center;
  justify-content: center;
}

.page-ellipsis span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 34px;
  height: 34px;
  color: #adb5bd;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  user-select: none;
}

.pagination-meta {
  gap: 0.5rem;
}

.pagination-total {
  font-size: 0.8rem;
  color: #6c757d;
  white-space: nowrap;
}

.pagination-size {
  font-size: 0.8rem;
  color: #6c757d;
}

.pagination-size-label {
  margin: 0;
  white-space: nowrap;
}

.pagination-size :deep(.multiselect) {
  min-width: 4.5rem;
  min-height: 34px;
}

.pagination-size :deep(.multiselect__select) {
  width: 24px;
  height: 34px;
  padding: 0 4px;
}

.pagination-size :deep(.multiselect__tags) {
  min-height: 34px;
  padding: 4px 28px 4px 8px;
  font-size: 0.8rem;
}

.pagination-size :deep(.multiselect__single) {
  font-size: 0.85rem;
  margin-bottom: 0;
  padding-left: 0;
}

@media (max-width: 767.98px) {
  .pagination-wrapper {
    flex-wrap: nowrap;
    gap: 0.5rem;
    padding: 0.5rem 0.25rem;
  }

  .pagination-list {
    gap: 2px;
  }

  .page-btn {
    min-width: 30px;
    height: 30px;
    padding: 0 6px;
    font-size: 0.75rem;
  }

  .page-ellipsis span {
    min-width: 18px;
    height: 30px;
    font-size: 0.85rem;
  }

  .pagination-size-label {
    display: none;
  }

  .pagination-size :deep(.multiselect) {
    min-width: 3.75rem;
  }
}
</style>
