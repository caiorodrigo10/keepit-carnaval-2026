"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { TimelineData } from "@/lib/dashboard";

interface TimelineChartProps {
  data: TimelineData[];
  title?: string;
  description?: string;
}

export function TimelineChart({
  data,
  title = "Atividade ao Longo do Tempo",
  description = "Leads e fotos por periodo",
}: TimelineChartProps) {
  if (data.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
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
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34BF58" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#34BF58" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorPhotos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#66FB95" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#66FB95" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Legend
                verticalAlign="top"
                height={36}
                formatter={(value) => (
                  <span className="text-sm text-foreground">
                    {value === "leads" ? "Leads" : "Fotos"}
                  </span>
                )}
              />
              <Area
                type="monotone"
                dataKey="leads"
                stroke="#34BF58"
                strokeWidth={2}
                fill="url(#colorLeads)"
                name="leads"
              />
              <Area
                type="monotone"
                dataKey="photos"
                stroke="#66FB95"
                strokeWidth={2}
                fill="url(#colorPhotos)"
                name="photos"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
