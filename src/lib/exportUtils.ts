/**
 * Export utilities for Excel and PDF formats
 */

import type { Contract } from "../types";

/**
 * Export data to CSV format
 */
export function exportToCSV(data: unknown[], filename: string): void {
  if (!data || data.length === 0) {
    console.warn("[export] No data to export");
    return;
  }

  const headers = Object.keys(data[0] as Record<string, unknown>);
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = (row as Record<string, unknown>)[header];
          // Escape quotes and wrap in quotes if contains comma or quote
          const stringValue = String(value ?? "");
          if (stringValue.includes(",") || stringValue.includes('"')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        })
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export contracts to CSV
 */
export function exportContractsToCSV(contracts: Contract[]): void {
  const exportData = contracts.map((c) => ({
    "Contract Number": c.contractNumber,
    "Brand": c.brand,
    "Model": c.model,
    "Registration": c.registration,
    "Driver Name": c.driverName,
    "Driver Phone": c.driverPhone,
    "Driver CIN": c.driverCin,
    "Departure Date": c.departureDate,
    "Return Date": c.returnDate,
    "Departure Time": c.departureTime,
    "Return Time": c.returnTime,
    "Total": c.totalFacture,
    "Deposit": c.depot,
  }));

  exportToCSV(exportData, `contracts_${new Date().toISOString().split("T")[0]}`);
}

/**
 * Export data to JSON format
 */
export function exportToJSON(data: unknown, filename: string): void {
  if (!data) {
    console.warn("[export] No data to export");
    return;
  }

  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.json`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export contracts to JSON
 */
export function exportContractsToJSON(contracts: Contract[]): void {
  exportToJSON(contracts, `contracts_${new Date().toISOString().split("T")[0]}`);
}

/**
 * Print data using browser's print functionality
 */
export function printData(data: unknown[], title: string): void {
  if (!data || data.length === 0) {
    console.warn("[export] No data to print");
    return;
  }

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    console.error("[export] Failed to open print window");
    return;
  }

  const headers = Object.keys(data[0] as Record<string, unknown>);
  const tableContent = `
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f4f4f4; }
          h1 { color: #333; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p>Generated on: ${new Date().toLocaleString()}</p>
        <table>
          <thead>
            <tr>
              ${headers.map((h) => `<th>${h}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${data
              .map(
                (row) => `
              <tr>
                ${headers
                  .map((header) => `<td>${(row as Record<string, unknown>)[header] ?? ""}</td>`)
                  .join("")}
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </body>
    </html>
  `;

  printWindow.document.write(tableContent);
  printWindow.document.close();
  printWindow.print();
}

/**
 * Print contracts
 */
export function printContracts(contracts: Contract[]): void {
  printData(contracts, "Contracts Report");
}
