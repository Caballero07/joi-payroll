import { useState } from "react";
import { usePayrollStore } from "@/store/payrollStore";
import { calcularNomina, type PayrollRecord } from "@/types/payroll";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Download, Lock, Search } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";

const fmt = (n: number) => n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

function generatePDF(record: PayrollRecord) {
  const doc = new jsPDF();
  const r = record.result;

  doc.setFontSize(18);
  doc.text("Recibo de Nómina", 20, 20);
  doc.setFontSize(11);
  doc.text(`Periodo: ${record.periodo}`, 20, 30);
  doc.text(`Fecha de cierre: ${record.fechaCierre}`, 20, 37);
  doc.text(`Empleado: ${record.empleadoNombre} (${record.empleadoId})`, 20, 47);
  doc.text(`Sueldo Base Mensual: ${fmt(record.sueldoBase)}`, 20, 57);

  let y = 70;
  doc.setFontSize(13);
  doc.text("Desglose", 20, y); y += 10;
  doc.setFontSize(10);

  const lines = [
    ["Sueldo Quincenal (Base/2)", fmt(r.sueldoQuincenal)],
    ["", ""],
    ["RETENCIONES", ""],
    [`Faltas (${record.config.diasFaltados} días)`, `-${fmt(r.descuentoFaltas)}`],
    ["", ""],
    ["EXTRAS", ""],
    ["KPI", `+${fmt(r.montoKpi)}`],
    [`Días Extra (${record.config.diasExtra})`, `+${fmt(r.montoDiasExtra)}`],
    ["Prima Dominical", `+${fmt(r.montoPrimaDominical)}`],
    ["Día Festivo", `+${fmt(r.montoDiaFestivo)}`],
    ["Bonos Adicionales", `+${fmt(r.bonosAdicionales)}`],
    ["", ""],
    ["Total Retenciones", `-${fmt(r.totalRetenciones)}`],
    ["Total Extras", `+${fmt(r.totalExtras)}`],
  ];

  lines.forEach(([label, val]) => {
    if (label === "") { y += 3; return; }
    if (label === "RETENCIONES" || label === "EXTRAS") {
      doc.setFont("helvetica", "bold");
      doc.text(label, 20, y);
      doc.setFont("helvetica", "normal");
    } else {
      doc.text(label, 25, y);
      doc.text(val, 170, y, { align: "right" });
    }
    y += 7;
  });

  y += 5;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("NETO A PAGAR", 20, y);
  doc.text(fmt(r.netoAPagar), 170, y, { align: "right" });

  doc.save(`nomina_${record.empleadoId}_${record.periodo.replace(/ /g, "_")}.pdf`);
}

export default function Historial() {
  const { employees, payrollConfigs, history, addHistoryRecords, currentPeriodo, resetPayrollConfigs } = usePayrollStore();
  const [search, setSearch] = useState("");

  const handleCerrarQuincena = () => {
    const records: PayrollRecord[] = employees.map((emp) => {
      const config = payrollConfigs[emp.id] || {
        empleadoId: emp.id, diasFaltados: 0, kpiAplicado: false,
        diasExtra: 0, primaDominical: false, diaFestivo: false, bonosAdicionales: 0,
      };
      const result = calcularNomina(emp, config);
      return {
        id: `${emp.id}-${Date.now()}`,
        periodo: currentPeriodo,
        fechaCierre: new Date().toLocaleDateString("es-MX"),
        empleadoId: emp.id,
        empleadoNombre: emp.nombre,
        config,
        result,
        sueldoBase: emp.sueldoBase,
      };
    });
    addHistoryRecords(records);
    resetPayrollConfigs();
    toast.success(`Quincena "${currentPeriodo}" cerrada con ${records.length} registros`);
  };

  const filtered = history.filter(
    (r) =>
      r.periodo.toLowerCase().includes(search.toLowerCase()) ||
      r.empleadoNombre.toLowerCase().includes(search.toLowerCase()) ||
      r.empleadoId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold">Historial de Nómina</h2>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button disabled={employees.length === 0}>
              <Lock className="mr-2 h-4 w-4" /> Cerrar Quincena
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Cerrar quincena actual?</AlertDialogTitle>
              <AlertDialogDescription>
                Se guardará un snapshot de la nómina de {employees.length} empleados para el periodo "{currentPeriodo}".
                Las incidencias se resetearán para la siguiente quincena.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleCerrarQuincena}>Cerrar Quincena</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por periodo, nombre o ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Periodo</TableHead>
                <TableHead>Empleado</TableHead>
                <TableHead>Fecha Cierre</TableHead>
                <TableHead className="text-right">Neto</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No hay registros en el historial
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((rec) => (
                  <TableRow key={rec.id}>
                    <TableCell className="font-medium">{rec.periodo}</TableCell>
                    <TableCell>{rec.empleadoNombre} ({rec.empleadoId})</TableCell>
                    <TableCell className="text-muted-foreground">{rec.fechaCierre}</TableCell>
                    <TableCell className="text-right font-semibold">{fmt(rec.result.netoAPagar)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => generatePDF(rec)}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
