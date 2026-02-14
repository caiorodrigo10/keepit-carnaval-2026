"use client";

import { useState } from "react";

interface DashboardData {
  leads: {
    total: number;
    recent: { name: string; email: string; phone: string; created_at: string }[];
  };
  aiPhotos: {
    total: number;
    completed: number;
    failed: number;
    templateUsage: { name: string; count: number }[];
  };
  orders: {
    total: number;
    pending: number;
    confirmed: number;
    recent: {
      customer_name: string;
      customer_email: string;
      customer_phone: string;
      total: number;
      status: string;
      created_at: string;
    }[];
  };
}

function formatDateBR(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export default function DadosPage() {
  const [password, setPassword] = useState("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"resumo" | "leads" | "pedidos">("resumo");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/dados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        setError("Senha incorreta");
        setLoading(false);
        return;
      }

      const json = await res.json();
      setData(json);
    } catch {
      setError("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-gray-900 rounded-2xl p-8 w-full max-w-sm space-y-4">
          <h1 className="text-2xl font-bold text-white text-center">Keepit Dados</h1>
          <p className="text-gray-400 text-sm text-center">Digite a senha para acessar o dashboard</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha"
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
            autoFocus
          />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? "Carregando..." : "Acessar"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold">Keepit Carnaval - Dashboard</h1>
          <button
            onClick={() => setData(null)}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Sair
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Leads Cadastrados" value={data.leads.total} color="green" />
          <KpiCard label="Fotos AI Geradas" value={data.aiPhotos.completed} color="blue" />
          <KpiCard label="Pedidos Feitos" value={data.orders.total} color="yellow" />
          <KpiCard label="Pedidos Confirmados" value={data.orders.confirmed} color="emerald" />
        </div>

        {/* Secondary KPIs */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          <MiniKpi label="Total Gerações" value={data.aiPhotos.total} />
          <MiniKpi label="Gerações OK" value={data.aiPhotos.completed} />
          <MiniKpi label="Gerações Falha" value={data.aiPhotos.failed} />
          <MiniKpi label="Taxa Sucesso" value={`${data.aiPhotos.total > 0 ? Math.round((data.aiPhotos.completed / data.aiPhotos.total) * 100) : 0}%`} />
          <MiniKpi label="Pedidos Pendentes" value={data.orders.pending} />
          <MiniKpi label="Pedidos Confirmados" value={data.orders.confirmed} />
        </div>

        {/* Template Usage */}
        {data.aiPhotos.templateUsage.length > 0 && (
          <div className="bg-gray-900 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4">Templates Mais Usados</h2>
            <div className="space-y-2">
              {data.aiPhotos.templateUsage.map((t) => (
                <div key={t.name} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-300">{t.name}</span>
                      <span className="text-sm font-mono text-gray-400">{t.count}</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{
                          width: `${(t.count / (data.aiPhotos.templateUsage[0]?.count || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2">
          <TabButton active={tab === "resumo"} onClick={() => setTab("resumo")}>Resumo</TabButton>
          <TabButton active={tab === "leads"} onClick={() => setTab("leads")}>Leads</TabButton>
          <TabButton active={tab === "pedidos"} onClick={() => setTab("pedidos")}>Pedidos</TabButton>
        </div>

        {/* Tab content */}
        {tab === "resumo" && (
          <div className="bg-gray-900 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-2">Resumo Geral</h2>
            <div className="text-gray-400 space-y-1 text-sm">
              <p>{data.leads.total} leads cadastrados na plataforma</p>
              <p>{data.aiPhotos.completed} fotos AI geradas com sucesso ({data.aiPhotos.failed} falharam)</p>
              <p>{data.orders.total} pedidos feitos, {data.orders.confirmed} confirmados</p>
            </div>
          </div>
        )}

        {tab === "leads" && (
          <div className="bg-gray-900 rounded-2xl p-6 overflow-x-auto">
            <h2 className="text-lg font-semibold mb-4">Leads Recentes ({data.leads.total} total)</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-800">
                  <th className="pb-2 pr-4">#</th>
                  <th className="pb-2 pr-4">Nome</th>
                  <th className="pb-2 pr-4">Email</th>
                  <th className="pb-2 pr-4">Telefone</th>
                  <th className="pb-2">Data</th>
                </tr>
              </thead>
              <tbody>
                {data.leads.recent.map((lead, i) => (
                  <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="py-2 pr-4 text-gray-500">{i + 1}</td>
                    <td className="py-2 pr-4 text-white">{lead.name}</td>
                    <td className="py-2 pr-4 text-gray-300">{lead.email}</td>
                    <td className="py-2 pr-4 text-gray-300 font-mono">{lead.phone}</td>
                    <td className="py-2 text-gray-400 whitespace-nowrap">{formatDateBR(lead.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "pedidos" && (
          <div className="bg-gray-900 rounded-2xl p-6 overflow-x-auto">
            <h2 className="text-lg font-semibold mb-4">Pedidos Recentes ({data.orders.total} total)</h2>
            {data.orders.recent.length === 0 ? (
              <p className="text-gray-500">Nenhum pedido ainda.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-800">
                    <th className="pb-2 pr-4">#</th>
                    <th className="pb-2 pr-4">Cliente</th>
                    <th className="pb-2 pr-4">Email</th>
                    <th className="pb-2 pr-4">Telefone</th>
                    <th className="pb-2 pr-4">Total</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {data.orders.recent.map((order, i) => (
                    <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="py-2 pr-4 text-gray-500">{i + 1}</td>
                      <td className="py-2 pr-4 text-white">{order.customer_name}</td>
                      <td className="py-2 pr-4 text-gray-300">{order.customer_email}</td>
                      <td className="py-2 pr-4 text-gray-300 font-mono">{order.customer_phone}</td>
                      <td className="py-2 pr-4 text-green-400 font-mono">{formatCurrency(order.total)}</td>
                      <td className="py-2 pr-4">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="py-2 text-gray-400 whitespace-nowrap">{formatDateBR(order.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  const colorMap: Record<string, string> = {
    green: "from-green-500/20 to-green-500/5 border-green-500/30",
    blue: "from-blue-500/20 to-blue-500/5 border-blue-500/30",
    yellow: "from-yellow-500/20 to-yellow-500/5 border-yellow-500/30",
    emerald: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30",
  };
  const textColor: Record<string, string> = {
    green: "text-green-400",
    blue: "text-blue-400",
    yellow: "text-yellow-400",
    emerald: "text-emerald-400",
  };

  return (
    <div className={`bg-gradient-to-b ${colorMap[color]} border rounded-2xl p-5`}>
      <p className="text-sm text-gray-400 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${textColor[color]}`}>{value}</p>
    </div>
  );
}

function MiniKpi({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-gray-900 rounded-xl p-3 text-center">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-lg font-bold text-white">{value}</p>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
        active ? "bg-green-500 text-black" : "bg-gray-800 text-gray-400 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-400",
    confirmed: "bg-green-500/20 text-green-400",
    cancelled: "bg-red-500/20 text-red-400",
  };

  const labels: Record<string, string> = {
    pending: "Pendente",
    confirmed: "Confirmado",
    cancelled: "Cancelado",
  };

  return (
    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${colors[status] || "bg-gray-700 text-gray-300"}`}>
      {labels[status] || status}
    </span>
  );
}
