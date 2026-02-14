/**
 * Lead export utilities
 * Provides CSV and Excel export functionality for leads data
 */

import * as XLSX from "xlsx";
import type { Lead, LeadOrigin } from "@/types/database";

export interface ExportFilters {
  startDate?: string;
  endDate?: string;
  origin?: LeadOrigin | "all";
  franchiseInterest?: boolean | "all";
}

export interface ExportableLead {
  nome: string;
  telefone: string;
  email: string;
  interesse_franquia: string;
  origem: string;
  consentimento_lgpd: string;
  data_cadastro: string;
}

const ORIGIN_LABELS: Record<LeadOrigin, string> = {
  qr_code: "QR Code",
  spontaneous: "Espontaneo",
  traffic: "Trafego Pago",
  roleta: "Roleta",
  pesquisa: "Pesquisa",
};

/**
 * Formats a lead for export with human-readable values
 */
function formatLeadForExport(lead: Lead): ExportableLead {
  return {
    nome: lead.name,
    telefone: formatPhone(lead.phone),
    email: lead.email,
    interesse_franquia: lead.franchise_interest ? "Sim" : "Nao",
    origem: ORIGIN_LABELS[lead.origin] || lead.origin,
    consentimento_lgpd: lead.lgpd_consent ? "Sim" : "Nao",
    data_cadastro: formatDateTime(lead.created_at),
  };
}

/**
 * Format phone number for display (XX) XXXXX-XXXX
 */
function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

/**
 * Format date/time for display
 */
function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Generates a filename with timestamp
 */
function generateFilename(extension: "csv" | "xlsx"): string {
  const now = new Date();
  const timestamp = now.toISOString().slice(0, 10).replace(/-/g, "");
  return `leads_keepit_carnaval_${timestamp}.${extension}`;
}

/**
 * Export leads to CSV format
 */
export function exportToCSV(leads: Lead[]): void {
  const formattedLeads = leads.map(formatLeadForExport);

  // Create worksheet from data
  const worksheet = XLSX.utils.json_to_sheet(formattedLeads);

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");

  // Generate CSV and trigger download
  const csvContent = XLSX.utils.sheet_to_csv(worksheet, { FS: ";" });
  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8" });

  downloadBlob(blob, generateFilename("csv"));
}

/**
 * Export leads to Excel (.xlsx) format
 */
export function exportToExcel(leads: Lead[]): void {
  const formattedLeads = leads.map(formatLeadForExport);

  // Create worksheet from data
  const worksheet = XLSX.utils.json_to_sheet(formattedLeads);

  // Set column widths
  worksheet["!cols"] = [
    { wch: 30 }, // nome
    { wch: 18 }, // telefone
    { wch: 35 }, // email
    { wch: 18 }, // interesse_franquia
    { wch: 15 }, // origem
    { wch: 18 }, // consentimento_lgpd
    { wch: 20 }, // data_cadastro
  ];

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");

  // Generate Excel file and trigger download
  XLSX.writeFile(workbook, generateFilename("xlsx"));
}

/**
 * Helper to download a blob as a file
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Filter leads based on export filters
 */
export function filterLeads(leads: Lead[], filters: ExportFilters): Lead[] {
  return leads.filter((lead) => {
    // Date range filter
    if (filters.startDate) {
      const leadDate = new Date(lead.created_at);
      const startDate = new Date(filters.startDate);
      startDate.setHours(0, 0, 0, 0);
      if (leadDate < startDate) return false;
    }

    if (filters.endDate) {
      const leadDate = new Date(lead.created_at);
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      if (leadDate > endDate) return false;
    }

    // Origin filter
    if (filters.origin && filters.origin !== "all") {
      if (lead.origin !== filters.origin) return false;
    }

    // Franchise interest filter
    if (filters.franchiseInterest !== undefined && filters.franchiseInterest !== "all") {
      if (lead.franchise_interest !== filters.franchiseInterest) return false;
    }

    return true;
  });
}
