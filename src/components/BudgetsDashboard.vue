<script setup lang="ts">
import { computed, ref, type Component } from 'vue';
import { useStore } from '@nanostores/vue';
import {
  Target,
  Pencil,
  Trash2,
  PiggyBank,
  TrendingUp,
  TrendingDown,
  HandCoins,
  CalendarClock,
  TriangleAlert,
  UtensilsCrossed,
  Zap,
  Car,
  HeartPulse,
  GraduationCap,
  PartyPopper,
  Shirt,
  Droplets,
  PawPrint,
  Package,
} from 'lucide-vue-next';
import {
  $budgetSummary,
  $budgetTotals,
  $rates,
  $savings,
  setBudget,
  type BudgetStatus,
  type CategoryBudgetStatus,
} from '../stores/budgetStore';
import { formatUsd, formatVes } from '../utils/formatters';
import Modal from '@/components/common/layout/Modal.vue';
import InputCurrency from '@/components/baseInput/InputCurrency.vue';
import ImportExportActions from '@/components/ImportExportActions.vue';

const summary = useStore($budgetSummary);
const totals = useStore($budgetTotals);
const savings = useStore($savings);
const rates = useStore($rates);

const CATEGORY_ICONS: Record<string, Component> = {
  Alimentación: UtensilsCrossed,
  Servicios: Zap,
  Transporte: Car,
  Salud: HeartPulse,
  Educación: GraduationCap,
  'Ropa y calzado': Shirt,
  'Higiene personal': Droplets,
  Mascotas: PawPrint,
  Ocio: PartyPopper,
  Otros: Package,
};

const STATUS_ORDER: Record<BudgetStatus, number> = {
  over: 0,
  near: 1,
  ok: 2,
  none: 3,
};

/** Orden: primero lo que necesita atención (excedido → cerca → ok → sin definir) */
const sorted = computed(() =>
  [...summary.value].sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      b.pctUsed - a.pctUsed,
  ),
);

const overCount = computed(
  () => sorted.value.filter((s) => s.status === 'over').length,
);
const savingsNegative = computed(() => savings.value.projectedUsd < 0);
const overallPct = computed(() =>
  totals.value.budgetUsd > 0
    ? Math.min(
        Math.max((totals.value.budgetedConsumedUsd / totals.value.budgetUsd) * 100, 0),
        100,
      )
    : 0,
);

const BAR_FILL: Record<BudgetStatus, string> = {
  over: 'f-over',
  near: 'f-near',
  ok: 'f-ok',
  none: 'f-none',
};
const STATUS_CLASS: Record<BudgetStatus, string> = {
  over: 'st-over',
  near: 'st-near',
  ok: 'st-ok',
  none: 'st-none',
};
const ICON_TONE: Record<BudgetStatus, string> = {
  over: 'ic-blue',
  near: 'ic-blue',
  ok: 'ic-blue',
  none: 'ic-none',
};
const MSG_CLASS: Record<BudgetStatus, string> = {
  over: 'm-over',
  near: 'm-near',
  ok: 'm-ok',
  none: 'm-none',
};

// --- Edición del presupuesto de una categoría ---
const editing = ref<CategoryBudgetStatus | null>(null);
const editAmount = ref('');

function openEditor(item: CategoryBudgetStatus) {
  editing.value = item;
  editAmount.value = item.budgetUsd > 0 ? String(item.budgetUsd) : '';
}

function closeEditor() {
  editing.value = null;
  editAmount.value = '';
}

function saveBudget() {
  if (!editing.value) return;
  const amount = parseFloat(editAmount.value);
  setBudget(editing.value.category, Number.isFinite(amount) ? amount : 0);
  closeEditor();
}

function clearBudget() {
  if (!editing.value) return;
  setBudget(editing.value.category, 0);
  closeEditor();
}
</script>

<template>
  <div class="dash">
    <!-- ══ Banda de resumen ══ -->
    <section class="band">
      <!-- Saldo proyectado -->
      <article class="card card-pad">
        <div class="card-head">
          <div class="head-left">
            <span class="ichip ichip-teal">
              <PiggyBank aria-hidden="true" />
            </span>
            <div>
              <h2 class="ttl">Saldo proyectado</h2>
              <p class="sub">Lo que te queda al cierre del mes</p>
            </div>
          </div>
          <span class="badge" :class="savingsNegative ? 'badge-bad' : 'badge-ok'">
            {{ savingsNegative ? 'Déficit' : 'A favor' }}
          </span>
        </div>

        <p class="num-xl" :class="savingsNegative ? 'c-bad' : 'c-ok'">
          {{ formatUsd(savings.projectedUsd) }}
        </p>

        <dl class="mini">
          <div>
            <dt><TrendingUp class="mini-ic c-ok" aria-hidden="true" />Ingresos</dt>
            <dd class="c-ok">+{{ formatUsd(savings.incomeUsd) }}</dd>
          </div>
          <div>
            <dt><HandCoins class="mini-ic c-violet" aria-hidden="true" />Por cobrar</dt>
            <dd class="c-violet">+{{ formatUsd(savings.receivableUsd) }}</dd>
          </div>
          <div>
            <dt><TrendingDown class="mini-ic c-bad" aria-hidden="true" />Gastos</dt>
            <dd class="c-bad">−{{ formatUsd(savings.expensesUsd) }}</dd>
          </div>
          <div>
            <dt><CalendarClock class="mini-ic c-amber" aria-hidden="true" />Por pagar</dt>
            <dd class="c-amber">−{{ formatUsd(savings.payablesUsd) }}</dd>
          </div>
        </dl>

        <p v-if="rates.bcv > 0" class="note">
          ≈ {{ formatVes(savings.projectedUsd * rates.bcv) }} a tasa BCV ·
          {{ formatVes(savings.projectedUsd * rates.usdt) }} a tasa USDT
        </p>
      </article>

      <!-- Presupuesto total del mes -->
      <article class="card card-pad">
        <div class="card-head">
          <div class="head-left">
            <span class="ichip ichip-blue">
              <Target aria-hidden="true" />
            </span>
            <div>
              <h2 class="ttl">Presupuesto del mes</h2>
              <p class="sub">Gastos del mes + cuentas por pagar pendientes</p>
            </div>
          </div>
          <span v-if="overCount > 0" class="badge badge-bad badge-warn">
            <TriangleAlert aria-hidden="true" />
            {{ overCount }} excedida(s)
          </span>
        </div>

        <div class="bigrow">
          <div>
            <p class="lbl">Consumido de</p>
            <p class="num-lg">
              {{ formatUsd(totals.budgetedConsumedUsd) }}
              <span class="den">/ {{ formatUsd(totals.budgetUsd) }}</span>
            </p>
          </div>
          <div class="right">
            <p class="lbl">{{ totals.remainingUsd < 0 ? 'Excedido por' : 'Te quedan' }}</p>
            <p class="num-md" :class="totals.remainingUsd < 0 ? 'c-bad' : 'c-ok'">
              {{ formatUsd(Math.abs(totals.remainingUsd)) }}
            </p>
          </div>
        </div>

        <div class="barwrap">
          <div class="barrow">
            <span class="pct">{{ Math.round(overallPct) }}% usado</span>
            <span v-if="totals.unbudgetedConsumedUsd > 0" class="extra">
              +{{ formatUsd(totals.unbudgetedConsumedUsd) }} sin presupuesto
            </span>
          </div>
          <div class="track">
            <div
              class="fill"
              :class="totals.remainingUsd < 0 ? 'f-over' : 'f-blue'"
              :style="{ width: `${overallPct}%` }"
            />
          </div>
        </div>
      </article>
    </section>

    <!-- ══ Categorías ══ -->
    <section>
      <div class="cats-head">
        <h2 class="cats-title">Por categoría</h2>
        <div class="cats-actions">
          <span class="cats-meta">{{ sorted.length }} categorías · mensual en USDT</span>
          <ImportExportActions />
        </div>
      </div>

      <div class="tiles">
        <article
          v-for="item in sorted"
          :key="item.category"
          class="tile"
          :class="STATUS_CLASS[item.status]"
          @click="openEditor(item)"
        >
          <div class="tile-in">
            <span class="ticon" :class="ICON_TONE[item.status]">
              <component :is="CATEGORY_ICONS[item.category] ?? Package" aria-hidden="true" />
            </span>
            <h3 class="tile-name">{{ item.category }}</h3>
            <Pencil class="pencil" aria-hidden="true" />
          </div>

          <p class="amt">
            <template v-if="item.budgetUsd > 0">
              <span class="spent" :class="item.status === 'over' ? 'c-bad' : 'c-amber'">
                {{ formatUsd(item.consumedUsd) }}
              </span>
              <span class="sep"> / </span>
              <span class="budget">{{ formatUsd(item.budgetUsd) }}</span>
            </template>
            <template v-else>
              <span class="spent c-amber">{{ formatUsd(item.consumedUsd) }}</span>
              <span class="sep"> gastado</span>
            </template>
          </p>

          <div class="tile-bar">
            <div class="track track-sm">
              <div
                class="fill"
                :class="BAR_FILL[item.status]"
                :style="{ width: `${Math.min(Math.max(item.pctUsed, 0), 100)}%` }"
              />
            </div>
          </div>

          <p class="msg" :class="MSG_CLASS[item.status]">
            <template v-if="item.status === 'over'">
              Excediste por {{ formatUsd(item.overUsd) }}
            </template>
            <template v-else-if="item.status === 'none'">
              Sin límite definido
            </template>
            <template v-else>
              Quedan {{ formatUsd(item.remainingUsd) }}
            </template>
          </p>
        </article>
      </div>
    </section>

    <!-- Modal de edición -->
    <Modal :open="editing !== null" size="sm" @close="closeEditor">
      <template #header>
        <div>
          <h3 class="modal-ttl">Presupuesto mensual</h3>
          <p class="modal-sub">{{ editing?.category }}</p>
        </div>
      </template>

      <div class="modal-body">
        <div>
          <label class="field-label" for="budget-amount">Monto en USDT</label>
          <InputCurrency
            id="budget-amount"
            v-model="editAmount"
            placeholder="0.00"
            @keydown.enter="saveBudget"
          />
          <p class="field-hint">Se repite cada mes; el consumo se reinicia automáticamente.</p>
        </div>

        <div class="modal-actions">
          <button
            v-if="editing && editing.budgetUsd > 0"
            type="button"
            class="btn btn-danger"
            @click="clearBudget"
          >
            <Trash2 aria-hidden="true" />
            Quitar
          </button>
          <span v-else />
          <div class="modal-actions-right">
            <button type="button" class="btn btn-ghost" @click="closeEditor">
              Cancelar
            </button>
            <button type="button" class="btn btn-primary" @click="saveBudget">
              Guardar
            </button>
          </div>
        </div>
      </div>
    </Modal>
  </div>
</template>

<style scoped>
/* ── Layout ─────────────────────────────────────────── */
.dash {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 1rem;
}
.band {
  display: grid;
  gap: 0.75rem;
}
@media (min-width: 768px) {
  .band {
    grid-template-columns: 1fr 1fr;
  }
}

/* ── Cards de resumen ───────────────────────────────── */
.card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 1rem;
  box-shadow: 0 1px 2px rgb(15 23 42 / 0.05);
}
.card-pad {
  padding: 1.25rem;
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.head-left {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.625rem;
}
.ichip {
  display: flex;
  height: 2.25rem;
  width: 2.25rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 0.75rem;
}
.ichip svg {
  height: 1.125rem;
  width: 1.125rem;
}
.ichip-teal {
  background: #f0fdfa;
  color: #0d9488;
}
.ichip-blue {
  background: #eff6ff;
  color: #2563eb;
}
.ttl {
  font-size: 0.875rem;
  font-weight: 700;
  color: #0f172a;
}
.sub {
  font-size: 0.6875rem;
  color: #64748b;
}
.badge {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.25rem;
  border-radius: 9999px;
  padding: 0.25rem 0.625rem;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.025em;
  text-transform: uppercase;
}
.badge svg {
  height: 0.75rem;
  width: 0.75rem;
}
.badge-ok {
  background: #ecfdf5;
  color: #059669;
}
.badge-bad {
  background: #fff1f2;
  color: #e11d48;
}
.num-xl {
  margin-top: 0.75rem;
  font-size: 1.875rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}
.mini {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem 1rem;
  margin-top: 0.75rem;
  border-top: 1px solid #f1f5f9;
  padding-top: 0.75rem;
  font-size: 0.75rem;
}
@media (min-width: 640px) {
  .mini {
    grid-template-columns: repeat(4, 1fr);
  }
}
.mini dt {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: #64748b;
}
.mini-ic {
  height: 0.75rem;
  width: 0.75rem;
  flex-shrink: 0;
}
.mini dd {
  margin-top: 0.125rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.note {
  margin-top: 0.75rem;
  font-size: 0.6875rem;
  color: #94a3b8;
}
.bigrow {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 0.75rem;
}
.right {
  text-align: right;
}
.lbl {
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #64748b;
}
.num-lg {
  margin-top: 0.125rem;
  font-size: 1.875rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: #0f172a;
  line-height: 1.2;
}
.den {
  font-size: 1rem;
  font-weight: 700;
  color: #94a3b8;
}
.num-md {
  margin-top: 0.125rem;
  font-size: 1.5rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
.barwrap {
  margin-top: 0.75rem;
}
.barrow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.6875rem;
}
.pct {
  font-weight: 600;
  color: #64748b;
}
.extra {
  color: #94a3b8;
}
.track {
  margin-top: 0.375rem;
  height: 0.5rem;
  overflow: hidden;
  border-radius: 9999px;
  background: #f1f5f9;
}
.track-sm {
  height: 0.25rem;
}
.fill {
  height: 100%;
  border-radius: 9999px;
  transition: width 0.5s ease;
}
.f-blue {
  background: #3b82f6;
}
.f-over {
  background: #f43f5e;
}
.f-ok {
  background: #10b981;
}
.f-near {
  background: #f59e0b;
}
.f-none {
  background: #cbd5e1;
}

/* ── Sección categorías ─────────────────────────────── */
.cats-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.625rem;
}
.cats-title {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #64748b;
}
.cats-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.cats-meta {
  font-size: 0.6875rem;
  color: #94a3b8;
}
.tiles {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.625rem;
}
@media (min-width: 640px) {
  .tiles {
    grid-template-columns: repeat(3, 1fr);
  }
}
@media (min-width: 1280px) {
  .tiles {
    grid-template-columns: repeat(5, 1fr);
  }
}

/* ── Tile de categoría ──────────────────────────────── */
.tile {
  position: relative;
  display: flex;
  cursor: pointer;
  flex-direction: column;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  background: #fff;
  padding: 0.75rem;
  box-shadow: 0 1px 2px rgb(15 23 42 / 0.05);
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease,
    border-color 0.15s ease;
}
.tile:hover {
  transform: translateY(-2px);
  border-color: #bfdbfe;
  box-shadow: 0 4px 6px -1px rgb(15 23 42 / 0.08);
}
.tile-in {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.ticon {
  display: flex;
  height: 1.75rem;
  width: 1.75rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}
.ticon svg {
  height: 0.875rem;
  width: 0.875rem;
}
.ic-blue {
  background: #eff6ff;
  color: #2563eb;
}
.ic-none {
  background: #f1f5f9;
  color: #94a3b8;
}
/* Hover: el icono revela el estado de la categoría */
.st-over:hover .ticon {
  background: #fff1f2;
  color: #e11d48;
}
.st-near:hover .ticon {
  background: #fffbeb;
  color: #d97706;
}
.st-ok:hover .ticon {
  background: #ecfdf5;
  color: #059669;
}
.st-none:hover .ticon {
  background: #eff6ff;
  color: #2563eb;
}
.tile-name {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.6875rem;
  font-weight: 700;
  color: #0f172a;
}
.pencil {
  height: 0.75rem;
  width: 0.75rem;
  flex-shrink: 0;
  color: #cbd5e1;
  opacity: 0;
  transition:
    opacity 0.15s ease,
    color 0.15s ease;
}
.tile:hover .pencil {
  color: #2563eb;
  opacity: 1;
}
.amt {
  margin-top: 0.5rem;
  font-size: 0.6875rem;
  font-variant-numeric: tabular-nums;
}
.spent {
  font-weight: 700;
}
.sep {
  color: #94a3b8;
}
.budget {
  font-weight: 700;
  color: #059669;
}
.tile-bar {
  margin-top: 0.375rem;
}
.msg {
  margin-top: auto;
  padding-top: 0.375rem;
  font-size: 0.625rem;
  font-weight: 600;
}
.m-over {
  color: #e11d48;
}
.m-near {
  color: #d97706;
}
.m-ok {
  color: #059669;
}
.m-none {
  color: #94a3b8;
}
/* Borde de estado: solo "excedida" se diferencia */
.st-over {
  border-color: #fecdd3;
}
.st-over:hover {
  border-color: #fda4af;
}

/* ── Colores de texto ───────────────────────────────── */
.c-ok {
  color: #059669;
}
.c-violet {
  color: #7c3aed;
}
.c-bad {
  color: #e11d48;
}
.c-amber {
  color: #d97706;
}

/* ── Modal ──────────────────────────────────────────── */
.modal-ttl {
  font-size: 1rem;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.25;
}
.modal-sub {
  font-size: 0.75rem;
  color: #64748b;
}
.modal-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.field-label {
  display: block;
  margin-bottom: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #475569;
}
.field-hint {
  margin-top: 0.25rem;
  font-size: 0.6875rem;
  color: #94a3b8;
}
.modal-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.modal-actions-right {
  display: flex;
  gap: 0.5rem;
}
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease;
  cursor: pointer;
}
.btn svg {
  height: 0.875rem;
  width: 0.875rem;
}
.btn-ghost {
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #475569;
}
.btn-ghost:hover {
  background: #f8fafc;
}
.btn-danger {
  border: 1px solid #fecdd3;
  background: #fff;
  color: #e11d48;
}
.btn-danger:hover {
  background: #fff1f2;
}
.btn-primary {
  border: 1px solid #2563eb;
  background: #2563eb;
  color: #fff;
  box-shadow: 0 1px 2px rgb(37 99 235 / 0.3);
}
.btn-primary:hover {
  background: #1d4ed8;
}
</style>
