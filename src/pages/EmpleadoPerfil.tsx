import { useParams, useNavigate } from "react-router-dom";
import { usePayrollStore } from "@/store/payrollStore";
import { calcularNomina, type Turno } from "@/types/payroll";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const fmt = (n: number) => n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

export default function EmpleadoPerfil() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { employees, updateEmployee, payrollConfigs, updatePayrollConfig } = usePayrollStore();

  const emp = employees.find((e) => e.id === id);
  if (!emp) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-muted-foreground">Empleado no encontrado</p>
        <Button variant="outline" onClick={() => navigate("/empleados")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver
        </Button>
      </div>
    );
  }

  const config = payrollConfigs[emp.id] || {
    empleadoId: emp.id, diasFaltados: 0, kpiAplicado: false,
    diasExtra: 0, primaDominical: false, diaFestivo: false, bonosAdicionales: 0,
  };
  const result = calcularNomina(emp, config);

  const saveField = (field: string, value: any) => {
    updateEmployee(emp.id, { [field]: value });
    toast.success("Dato guardado");
  };

  const saveConfig = (field: string, value: any) => {
    updatePayrollConfig(emp.id, { [field]: value });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <Button variant="ghost" onClick={() => navigate("/empleados")}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Empleados
      </Button>

      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-lg">{emp.nombre[0]}</span>
        </div>
        <div>
          <h2 className="text-2xl font-bold">{emp.nombre}</h2>
          <p className="text-muted-foreground">ID: {emp.id} · Turno: {emp.turno}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Configuración Salarial */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Configuración Salarial</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Sueldo Base Mensual</Label>
              <Input type="number" value={emp.sueldoBase || ""} onChange={(e) => saveField("sueldoBase", parseFloat(e.target.value) || 0)} />
            </div>
            <div className="grid gap-2">
              <Label>Descuento por Día Faltado</Label>
              <Input type="number" value={emp.descuentoPorDia || ""} onChange={(e) => saveField("descuentoPorDia", parseFloat(e.target.value) || 0)} />
            </div>
            <div className="grid gap-2">
              <Label>KPI (Monto Extra)</Label>
              <Input type="number" value={emp.kpiMonto || ""} onChange={(e) => saveField("kpiMonto", parseFloat(e.target.value) || 0)} />
            </div>
            <div className="grid gap-2">
              <Label>Turno</Label>
              <Select value={emp.turno} onValueChange={(v) => saveField("turno", v as Turno)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Lunes-Jueves">Lunes-Jueves</SelectItem>
                  <SelectItem value="Lunes-Viernes">Lunes-Viernes</SelectItem>
                  <SelectItem value="Viernes-Domingo">Viernes-Domingo</SelectItem>
                  <SelectItem value="Viernes-Lunes">Viernes-Lunes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground">Sueldo Diario</p>
              <p className="text-xl font-bold">{fmt(result.sueldoDiario)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Control de Asistencia y Extras */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Incidencias Quincenales</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Días Faltados</Label>
              <Input type="number" min={0} value={config.diasFaltados || ""} onChange={(e) => saveConfig("diasFaltados", parseInt(e.target.value) || 0)} />
            </div>
            <div className="flex items-center gap-3">
              <Checkbox id="kpi" checked={config.kpiAplicado} onCheckedChange={(v) => saveConfig("kpiAplicado", !!v)} />
              <Label htmlFor="kpi" className="cursor-pointer">
                KPI logrado (+{fmt(emp.kpiMonto)})
              </Label>
            </div>
            <div className="grid gap-2">
              <Label>Días Extra</Label>
              <Select value={String(config.diasExtra)} onValueChange={(v) => saveConfig("diasExtra", parseInt(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[0,1,2,3,4,5,6,7].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n} día{n !== 1 ? "s" : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox id="prima" checked={config.primaDominical} onCheckedChange={(v) => saveConfig("primaDominical", !!v)} />
              <Label htmlFor="prima" className="cursor-pointer">
                Prima Dominical (25% del sueldo diario)
              </Label>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox id="festivo" checked={config.diaFestivo} onCheckedChange={(v) => saveConfig("diaFestivo", !!v)} />
              <Label htmlFor="festivo" className="cursor-pointer">
                Día Festivo (triple del sueldo diario)
              </Label>
            </div>
            <div className="grid gap-2">
              <Label>Bonos Adicionales</Label>
              <Input type="number" min={0} value={config.bonosAdicionales || ""} onChange={(e) => saveConfig("bonosAdicionales", parseFloat(e.target.value) || 0)} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Desglose */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Desglose Quincenal</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3">
            <Row label="Sueldo Quincenal (Base/2)" value={fmt(result.sueldoQuincenal)} />
            <Separator />
            <p className="text-sm font-semibold text-destructive">Retenciones</p>
            <Row label={`Faltas (${config.diasFaltados} × ${fmt(emp.descuentoPorDia)})`} value={`-${fmt(result.descuentoFaltas)}`} negative />
            <Separator />
            <p className="text-sm font-semibold text-primary">Extras</p>
            <Row label="KPI" value={`+${fmt(result.montoKpi)}`} />
            <Row label={`Días Extra (${config.diasExtra} × $1,000)`} value={`+${fmt(result.montoDiasExtra)}`} />
            <Row label="Prima Dominical" value={`+${fmt(result.montoPrimaDominical)}`} />
            <Row label="Día Festivo" value={`+${fmt(result.montoDiaFestivo)}`} />
            <Row label="Bonos Adicionales" value={`+${fmt(result.bonosAdicionales)}`} />
            <Separator />
            <div className="flex justify-between items-center p-3 rounded-lg bg-primary/10">
              <span className="font-bold text-lg">Neto a Pagar</span>
              <span className="font-bold text-2xl text-primary">{fmt(result.netoAPagar)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value, negative }: { label: string; value: string; negative?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={negative ? "text-destructive" : ""}>{value}</span>
    </div>
  );
}
