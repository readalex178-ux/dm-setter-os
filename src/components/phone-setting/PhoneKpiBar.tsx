import { Card, CardContent } from "@/components/ui/card";
import { PhoneCall, PhoneIncoming, Percent, CalendarCheck, TrendingUp, CalendarX } from "lucide-react";
import type { PhoneKpis } from "@/hooks/usePhoneSetting";

interface Props {
  kpis: PhoneKpis;
}

export function PhoneKpiBar({ kpis }: Props) {
  const metrics: { label: string; value: string; icon: React.ElementType }[] = [
    { label: "Calls Attempted", value: String(kpis.callsAttempted), icon: PhoneCall },
    { label: "Calls Connected", value: String(kpis.callsConnected), icon: PhoneIncoming },
    { label: "Connection Rate", value: `${kpis.connectionRate}%`, icon: Percent },
    { label: "Appointments Booked", value: String(kpis.appointmentsBooked), icon: CalendarCheck },
    { label: "Booking Rate", value: `${kpis.bookingRate}%`, icon: TrendingUp },
    { label: "No Show Rate", value: `${kpis.noShowRate}%`, icon: CalendarX },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {metrics.map((m) => (
        <Card key={m.label}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <m.icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">{m.label}</span>
            </div>
            <span className="text-2xl font-bold">{m.value}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
