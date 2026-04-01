import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Employee, PayrollConfig, PayrollRecord } from '@/types/payroll';

interface PayrollState {
  employees: Employee[];
  payrollConfigs: Record<string, PayrollConfig>;
  history: PayrollRecord[];
  currentPeriodo: string;

  addEmployee: (emp: Employee) => void;
  addEmployees: (emps: Employee[]) => void;
  updateEmployee: (id: string, data: Partial<Employee>) => void;
  removeEmployee: (id: string) => void;
  getPayrollConfig: (empId: string) => PayrollConfig;
  updatePayrollConfig: (empId: string, config: Partial<PayrollConfig>) => void;
  addHistoryRecords: (records: PayrollRecord[]) => void;
  setCurrentPeriodo: (p: string) => void;
  resetPayrollConfigs: () => void;
}

function defaultConfig(empId: string): PayrollConfig {
  return {
    empleadoId: empId,
    diasFaltados: 0,
    kpiAplicado: false,
    diasExtra: 0,
    primaDominical: false,
    diaFestivo: false,
    bonosAdicionales: 0,
  };
}

function getCurrentPeriodo(): string {
  const now = new Date();
  const day = now.getDate();
  const month = now.toLocaleString('es-MX', { month: 'long' });
  const year = now.getFullYear();
  return day <= 15
    ? `1-15 ${month} ${year}`
    : `16-${new Date(year, now.getMonth() + 1, 0).getDate()} ${month} ${year}`;
}

export const usePayrollStore = create<PayrollState>()(
  persist(
    (set, get) => ({
      employees: [],
      payrollConfigs: {},
      history: [],
      currentPeriodo: getCurrentPeriodo(),

      addEmployee: (emp) =>
        set((s) => ({
          employees: [...s.employees, emp],
          payrollConfigs: { ...s.payrollConfigs, [emp.id]: defaultConfig(emp.id) },
        })),

      addEmployees: (emps) =>
        set((s) => {
          const newConfigs = { ...s.payrollConfigs };
          emps.forEach((e) => {
            if (!newConfigs[e.id]) newConfigs[e.id] = defaultConfig(e.id);
          });
          const existingIds = new Set(s.employees.map((e) => e.id));
          const unique = emps.filter((e) => !existingIds.has(e.id));
          return { employees: [...s.employees, ...unique], payrollConfigs: newConfigs };
        }),

      updateEmployee: (id, data) =>
        set((s) => ({
          employees: s.employees.map((e) => (e.id === id ? { ...e, ...data } : e)),
        })),

      removeEmployee: (id) =>
        set((s) => {
          const { [id]: _, ...rest } = s.payrollConfigs;
          return {
            employees: s.employees.filter((e) => e.id !== id),
            payrollConfigs: rest,
          };
        }),

      getPayrollConfig: (empId) => {
        const configs = get().payrollConfigs;
        return configs[empId] || defaultConfig(empId);
      },

      updatePayrollConfig: (empId, config) =>
        set((s) => ({
          payrollConfigs: {
            ...s.payrollConfigs,
            [empId]: { ...(s.payrollConfigs[empId] || defaultConfig(empId)), ...config },
          },
        })),

      addHistoryRecords: (records) =>
        set((s) => ({ history: [...records, ...s.history] })),

      setCurrentPeriodo: (p) => set({ currentPeriodo: p }),

      resetPayrollConfigs: () =>
        set((s) => {
          const fresh: Record<string, PayrollConfig> = {};
          s.employees.forEach((e) => (fresh[e.id] = defaultConfig(e.id)));
          return { payrollConfigs: fresh };
        }),
    }),
    { name: 'nomina-pro-storage' }
  )
);
