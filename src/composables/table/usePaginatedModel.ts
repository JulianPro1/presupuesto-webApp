import { computed } from 'vue'
import { usePaginationStore } from '@/store/pagination'
import { TABLE_PAGINATION } from '@/const/tableConst'
import type { PaginatedData } from '@/interfaces/http'

export function usePaginatedModel(key: string) {
  const store = usePaginationStore()

  const currentPage = computed({
    get: () => store.getPage(key),
    set: (page: number) => store.setPage({ key, page }),
  })

  const totalPages = computed({
    get: () => store.getTotalPages(key),
    set: (totalPages: number) => store.setTotalPages({ key, totalPages }),
  })

  const perPage = computed({
    get: () => store.getPerPage(key),
    set: (perPage: number) => store.setPerPage({ key, perPage }),
  })

  const total = computed({
    get: () => store.getTotal(key),
    set: (total: number) => store.setTotal({ key, total }),
  })

  const filters = computed({
    get: () => store.getFilters(key),
    set: (value: Record<string, unknown>) => store.setFilters({ key, filters: value }),
  })

  function syncWith<T>(response: PaginatedData<T>) {
    store.setFromResponse({ key, response })
  }

  function setFilters(value: Record<string, unknown>) {
    store.setFilters({ key, filters: value })
  }

  function setPage(page: number) {
    store.setPage({ key, page })
  }

  function reset() {
    store.clearPagination(key)
  }

  function buildParams(
    extra: Record<string, unknown> = {},
    { perPageKey = 'limit', pageKey = 'page' }: { perPageKey?: string; pageKey?: string } = {}
  ) {
    return {
      [perPageKey]: perPage.value,
      [pageKey]: currentPage.value,
      ...filters.value,
      ...extra,
    }
  }

  function setPerPage(value: number) {
    store.setPerPage({ key, perPage: value })
    // Cambiar el tamaño de página vuelve a la primera página (mismo contrato
    // que CustomTable: change-per-page implica change-page(1)).
    store.setPage({ key, page: TABLE_PAGINATION.currentPage })
  }

  return {
    currentPage,
    totalPages,
    perPage,
    total,
    filters,
    syncWith,
    setFilters,
    setPage,
    setPerPage,
    reset,
    buildParams,
  }
}
