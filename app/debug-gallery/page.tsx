"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import JSZip from "jszip";

// ─── Types ───────────────────────────────────────────────

interface Generation {
  id: string;
  status: string;
  reference_photos: string[];
  variant_1_url: string | null;
  error_message: string | null;
  processing_time_ms: number | null;
  created_at: string;
}

interface OutputPhoto {
  id: string;
  variant_1_url: string;
  created_at: string;
}

interface ApiResponse {
  generations: Generation[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

interface OutputsResponse {
  generations: OutputPhoto[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

type Tab = "log" | "download";

function toBrasilia(utcDate: string): string {
  const d = new Date(utcDate);
  return d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

// ─── Main Page ───────────────────────────────────────────

export default function DebugGalleryPage() {
  const [tab, setTab] = useState<Tab>("log");
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");

    try {
      const res = await fetch("/api/debug-gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        setAuthError("Senha incorreta");
        setAuthLoading(false);
        return;
      }

      setAuthed(true);
    } catch {
      setAuthError("Erro ao verificar senha");
    } finally {
      setAuthLoading(false);
    }
  }

  if (!authed) {
    return (
      <div style={{ background: "#111", color: "#fff", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif", padding: "24px" }}>
        <form onSubmit={handleLogin} style={{ background: "#1a1a1a", borderRadius: "24px", padding: "32px", width: "100%", maxWidth: "360px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: 900, textAlign: "center", margin: 0 }}>Debug Gallery</h1>
          <p style={{ color: "#999", fontSize: "14px", textAlign: "center", margin: 0 }}>Digite a senha para acessar</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha"
            autoFocus
            style={{
              width: "100%", padding: "12px 16px", background: "#222", border: "1px solid #444",
              borderRadius: "12px", color: "#fff", fontSize: "16px", outline: "none",
              boxSizing: "border-box",
            }}
          />
          {authError && <p style={{ color: "#ff4444", fontSize: "13px", textAlign: "center", margin: 0 }}>{authError}</p>}
          <button
            type="submit"
            disabled={authLoading}
            style={{
              padding: "12px", background: "#66FB95", color: "#111", border: "none",
              borderRadius: "12px", fontSize: "16px", fontWeight: 700, cursor: authLoading ? "default" : "pointer",
              opacity: authLoading ? 0.6 : 1,
            }}
          >
            {authLoading ? "Verificando..." : "Acessar"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ background: "#111", color: "#fff", minHeight: "100vh", padding: "24px", fontFamily: "Inter, sans-serif" }}>
      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "24px", background: "#1a1a1a", borderRadius: "12px", padding: "4px", width: "fit-content" }}>
        {([["log", "Log"], ["download", "Download"]] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: "8px 24px",
              borderRadius: "10px",
              border: "none",
              background: tab === key ? "#fff" : "transparent",
              color: tab === key ? "#111" : "#999",
              fontSize: "14px",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "log" && <LogTab password={password} />}
      {tab === "download" && <DownloadTab password={password} />}
    </div>
  );
}

// ─── Log Tab ─────────────────────────────────────────────

function LogTab({ password }: { password: string }) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/debug-gallery?page=${page}&status=${status}`, { headers: { "x-password": password } })
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [page, status, password]);

  const statusColors: Record<string, string> = {
    completed: "#66FB95",
    failed: "#ff4444",
    processing: "#ffaa00",
  };

  return (
    <>
      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out", padding: "24px" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="Zoom" style={{ maxWidth: "95vw", maxHeight: "95vh", borderRadius: "8px", objectFit: "contain" }} />
          <span style={{ position: "absolute", top: "16px", right: "24px", color: "#999", fontSize: "14px" }}>Clique para fechar</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 900, margin: 0 }}>AI Photo Generations Log</h1>
          {data && <p style={{ color: "#999", fontSize: "14px", marginTop: "4px" }}>{data.total} geracoes total — Pagina {data.page} de {data.totalPages}</p>}
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {["all", "completed", "failed"].map((s) => (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(1); }}
              style={{
                padding: "6px 16px", borderRadius: "9999px",
                border: status === s ? "2px solid #66FB95" : "1px solid #444",
                background: status === s ? "#66FB9520" : "transparent",
                color: status === s ? "#66FB95" : "#999",
                fontSize: "13px", fontWeight: 600, cursor: "pointer",
              }}
            >
              {s === "all" ? "Todas" : s === "completed" ? "Sucesso" : "Falhas"}
            </button>
          ))}
        </div>
      </div>

      {loading && <div style={{ textAlign: "center", padding: "60px 0", color: "#666" }}>Carregando...</div>}

      {!loading && data && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {data.generations.map((gen, i) => {
            const globalIndex = (data.page - 1) * data.perPage + i + 1;
            return (
              <div key={gen.id} style={{ background: "#1a1a1a", borderRadius: "16px", padding: "16px", border: `1px solid ${gen.status === "failed" ? "#ff444440" : "#333"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: "#fff" }}>#{globalIndex}</span>
                    <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "9999px", background: `${statusColors[gen.status] || "#666"}20`, color: statusColors[gen.status] || "#666", textTransform: "uppercase", letterSpacing: "0.5px" }}>{gen.status}</span>
                    <span style={{ fontSize: "13px", color: "#ccc" }}>{toBrasilia(gen.created_at)}</span>
                  </div>
                  <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "#666" }}>
                    {gen.processing_time_ms && <span>{(gen.processing_time_ms / 1000).toFixed(1)}s</span>}
                    <span style={{ fontFamily: "monospace", fontSize: "11px" }}>{gen.id.slice(0, 8)}</span>
                  </div>
                </div>

                {gen.status === "failed" && gen.error_message && (
                  <div style={{ background: "#ff444415", border: "1px solid #ff444430", borderRadius: "8px", padding: "10px 14px", marginBottom: "12px", fontSize: "12px", color: "#ff8888", wordBreak: "break-word" }}>
                    {gen.error_message}
                  </div>
                )}

                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  {gen.reference_photos?.[0] && (
                    <div>
                      <p style={{ fontSize: "10px", color: "#666", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "1px" }}>Input</p>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={gen.reference_photos[0]} alt="Input" onClick={() => setLightbox(gen.reference_photos[0])} style={{ height: "180px", borderRadius: "8px", background: "#000", display: "block", cursor: "zoom-in", objectFit: "contain" }} />
                    </div>
                  )}
                  {gen.variant_1_url && (
                    <div>
                      <p style={{ fontSize: "10px", color: "#666", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "1px" }}>Output</p>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={gen.variant_1_url} alt="Output" onClick={() => setLightbox(gen.variant_1_url!)} style={{ height: "180px", borderRadius: "8px", background: "#000", display: "block", cursor: "zoom-in", objectFit: "contain" }} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {data.generations.length === 0 && <div style={{ textAlign: "center", padding: "60px 0", color: "#666" }}>Nenhuma geracao encontrada.</div>}
        </div>
      )}

      <Pagination page={page} totalPages={data?.totalPages || 1} onPageChange={setPage} />
    </>
  );
}

// ─── Download Tab ────────────────────────────────────────

function DownloadTab({ password }: { password: string }) {
  const [photos, setPhotos] = useState<OutputPhoto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadPage = useCallback(async (pageNum: number) => {
    const isFirst = pageNum === 1;
    if (isFirst) setLoading(true); else setLoadingMore(true);

    try {
      const res = await fetch(`/api/debug-gallery?page=${pageNum}&per_page=30&outputs_only=true`, { headers: { "x-password": password } });
      const d: OutputsResponse = await res.json();
      setPhotos((prev) => isFirst ? d.generations : [...prev, ...d.generations]);
      setTotal(d.total);
      setHasMore(pageNum < d.totalPages);
    } catch {
      // ignore
    } finally {
      if (isFirst) setLoading(false); else setLoadingMore(false);
    }
  }, [password]);

  // Load first page
  useEffect(() => { loadPage(1); }, [loadPage]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          setPage((prev) => {
            const next = prev + 1;
            loadPage(next);
            return next;
          });
        }
      },
      { rootMargin: "400px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, loadPage]);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected((prev) => {
      const allSelected = photos.length > 0 && photos.every((g) => prev.has(g.id));
      if (allSelected) return new Set();
      const next = new Set(prev);
      photos.forEach((g) => next.add(g.id));
      return next;
    });
  }, [photos]);

  const handleDownload = useCallback(async () => {
    if (selected.size === 0) return;

    setDownloading(true);
    setDownloadProgress(0);

    const zip = new JSZip();
    const toDownload = photos.filter((g) => selected.has(g.id));
    let done = 0;

    for (const photo of toDownload) {
      try {
        const res = await fetch(photo.variant_1_url);
        const blob = await res.blob();
        const ext = photo.variant_1_url.includes(".png") ? "png" : "jpg";
        const date = new Date(photo.created_at);
        const ts = date.toISOString().slice(0, 19).replace(/[T:]/g, "-");
        zip.file(`keepit-carnaval_${ts}_${photo.id.slice(0, 8)}.${ext}`, blob);
      } catch {
        // skip failed downloads
      }
      done++;
      setDownloadProgress(Math.round((done / toDownload.length) * 100));
    }

    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = `keepit-carnaval-fotos-${new Date().toISOString().slice(0, 10)}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloading(false);
    setDownloadProgress(0);
  }, [photos, selected]);

  const allLoaded = photos.length > 0;
  const allSelected = allLoaded && photos.every((g) => selected.has(g.id));

  return (
    <>
      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out", padding: "24px" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="Zoom" style={{ maxWidth: "95vw", maxHeight: "95vh", borderRadius: "8px", objectFit: "contain" }} />
          <span style={{ position: "absolute", top: "16px", right: "24px", color: "#999", fontSize: "14px" }}>Clique para fechar</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 900, margin: 0 }}>Download Fotos</h1>
          <p style={{ color: "#999", fontSize: "14px", marginTop: "4px" }}>
            {total} fotos geradas — {photos.length} carregadas{selected.size > 0 && ` — ${selected.size} selecionada${selected.size > 1 ? "s" : ""}`}
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button
            onClick={selectAll}
            disabled={!allLoaded}
            style={{
              padding: "6px 16px", borderRadius: "9999px", border: "1px solid #444",
              background: allSelected ? "#66FB9520" : "transparent",
              color: allSelected ? "#66FB95" : "#999",
              fontSize: "13px", fontWeight: 600, cursor: "pointer",
            }}
          >
            {allSelected ? "Desmarcar tudo" : "Selecionar tudo"}
          </button>

          <button
            onClick={handleDownload}
            disabled={selected.size === 0 || downloading}
            style={{
              padding: "8px 24px", borderRadius: "9999px", border: "none",
              background: selected.size === 0 ? "#333" : "#66FB95",
              color: selected.size === 0 ? "#666" : "#111",
              fontSize: "14px", fontWeight: 700,
              cursor: selected.size === 0 || downloading ? "default" : "pointer",
              opacity: downloading ? 0.7 : 1,
            }}
          >
            {downloading
              ? `Baixando... ${downloadProgress}%`
              : selected.size === 0
                ? "Selecione fotos"
                : `Baixar ${selected.size} foto${selected.size > 1 ? "s" : ""} (ZIP)`
            }
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {downloading && (
        <div style={{ height: "3px", background: "#333", borderRadius: "2px", marginBottom: "24px", overflow: "hidden" }}>
          <div style={{ height: "100%", background: "#66FB95", borderRadius: "2px", width: `${downloadProgress}%`, transition: "width 0.3s" }} />
        </div>
      )}

      {loading && <div style={{ textAlign: "center", padding: "60px 0", color: "#666" }}>Carregando...</div>}

      {/* Photo grid */}
      {!loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "12px" }}>
          {photos.map((photo) => {
            const isSelected = selected.has(photo.id);
            return (
              <div
                key={photo.id}
                onClick={() => toggleSelect(photo.id)}
                style={{
                  position: "relative",
                  borderRadius: "12px",
                  overflow: "hidden",
                  cursor: "pointer",
                  border: isSelected ? "3px solid #66FB95" : "3px solid transparent",
                  background: "#000",
                  transition: "border-color 0.15s",
                }}
              >
                {/* Checkbox */}
                <div style={{
                  position: "absolute", top: "8px", left: "8px", zIndex: 2,
                  width: "24px", height: "24px", borderRadius: "6px",
                  background: isSelected ? "#66FB95" : "rgba(0,0,0,0.5)",
                  border: isSelected ? "none" : "2px solid rgba(255,255,255,0.4)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s",
                }}>
                  {isSelected && <span style={{ color: "#111", fontSize: "14px", fontWeight: 900 }}>✓</span>}
                </div>

                {/* Zoom button */}
                <button
                  onClick={(e) => { e.stopPropagation(); setLightbox(photo.variant_1_url); }}
                  style={{
                    position: "absolute", top: "8px", right: "8px", zIndex: 2,
                    width: "28px", height: "28px", borderRadius: "6px",
                    background: "rgba(0,0,0,0.5)", border: "none",
                    color: "#fff", fontSize: "14px", cursor: "zoom-in",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  ⤢
                </button>

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.variant_1_url}
                  alt={photo.id}
                  style={{ width: "100%", height: "200px", objectFit: "cover", display: "block" }}
                />

                <div style={{ padding: "6px 8px", fontSize: "10px", color: "#666" }}>
                  {toBrasilia(photo.created_at)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && photos.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#666" }}>Nenhuma foto encontrada.</div>
      )}

      {/* Sentinel for infinite scroll */}
      <div ref={sentinelRef} style={{ height: "1px" }} />

      {loadingMore && (
        <div style={{ textAlign: "center", padding: "24px 0", color: "#666" }}>Carregando mais fotos...</div>
      )}

      {!hasMore && photos.length > 0 && (
        <div style={{ textAlign: "center", padding: "24px 0 40px", color: "#444", fontSize: "13px" }}>Todas as {total} fotos carregadas</div>
      )}
    </>
  );
}

// ─── Shared Pagination ───────────────────────────────────

function Pagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (p: number) => void }) {
  if (totalPages <= 1) return null;

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", marginTop: "40px", paddingBottom: "40px" }}>
      <button
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        style={{
          padding: "8px 20px", borderRadius: "9999px", border: "1px solid #444",
          background: page <= 1 ? "#222" : "transparent",
          color: page <= 1 ? "#555" : "#fff",
          fontSize: "13px", fontWeight: 600, cursor: page <= 1 ? "default" : "pointer",
        }}
      >
        Anterior
      </button>

      <div style={{ display: "flex", gap: "4px" }}>
        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
          let pageNum: number;
          if (totalPages <= 7) {
            pageNum = i + 1;
          } else if (page <= 4) {
            pageNum = i + 1;
          } else if (page >= totalPages - 3) {
            pageNum = totalPages - 6 + i;
          } else {
            pageNum = page - 3 + i;
          }
          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              style={{
                width: "36px", height: "36px", borderRadius: "9999px",
                border: pageNum === page ? "2px solid #66FB95" : "1px solid #333",
                background: pageNum === page ? "#66FB9520" : "transparent",
                color: pageNum === page ? "#66FB95" : "#999",
                fontSize: "13px", fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {pageNum}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        style={{
          padding: "8px 20px", borderRadius: "9999px", border: "1px solid #444",
          background: page >= totalPages ? "#222" : "transparent",
          color: page >= totalPages ? "#555" : "#fff",
          fontSize: "13px", fontWeight: 600, cursor: page >= totalPages ? "default" : "pointer",
        }}
      >
        Proxima
      </button>
    </div>
  );
}
