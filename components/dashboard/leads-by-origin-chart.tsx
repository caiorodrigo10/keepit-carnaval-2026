"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Legend, Tooltip, type PieLabelRenderProps } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { LeadsByOrigin } from "@/lib/dashboard";

interface LeadsByOriginChartProps {
  data: LeadsByOrigin[];
}

const COLORS: Record<string, string> = {
  qr_code: "#34BF58",
  spontaneous: "#66FB95",
  traffic: "#8FFCB0",
};

const renderLabel = (props: PieLabelRenderProps): string => {
  const name = props.name ?? "";
  const percent = typeof props.percent === "number" ? props.percent : 0;
  return `${name} (${(percent * 100).toFixed(0)}%)`;
};

export function LeadsByOriginChart({ data }: LeadsByOriginChartProps) {
  const total = data.reduce((sum, item) => sum + item.count, 0);

  if (data.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Leads por Origem</CardTitle>
          <CardDescription>Distribuicao de leads por canal</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground text-sm">Nenhum dado disponivel</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Leads por Origem</CardTitle>
        <CardDescription>Distribuicao de leads por canal</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="count"
                nameKey="label"
                label={renderLabel}
                labelLine={false}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[entry.origin] || "#ccc"}
                    strokeWidth={2}
                    stroke="#fff"
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [value, "Leads"]}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value) => (
                  <span className="text-sm text-foreground">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="text-center mt-4">
          <p className="text-2xl font-bold">{total}</p>
          <p className="text-sm text-muted-foreground">Total de leads</p>
        </div>
      </CardContent>
    </Card>
  );
}
