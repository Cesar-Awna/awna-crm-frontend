import React, { useState } from 'react';
import { Upload, Check, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from './ui/button.jsx';
import LeadsService from '../services/Leads.js';

const LeadImportModal = ({ isOpen, onClose, onSuccess, buSchema }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const REQUIRED_COLUMNS = ['razonSocial', 'rutEmpresa', 'nombreContacto', 'correo', 'telefono'];
  const OPTIONAL_COLUMNS = ['executiveEmail'];

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    try {
      setError(null);
      setPreview(null);
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(worksheet);

      if (rows.length === 0) {
        setError('El archivo está vacío');
        return;
      }

      // Validate columns
      const firstRow = rows[0];
      const columns = Object.keys(firstRow);
      const missingColumns = REQUIRED_COLUMNS.filter((col) => !columns.includes(col));

      if (missingColumns.length > 0) {
        setError(`Columnas faltantes: ${missingColumns.join(', ')}`);
        return;
      }

      setFile(selectedFile);
      setPreview({
        total: rows.length,
        rows: rows.slice(0, 5),
        hasMore: rows.length > 5,
      });
    } catch (err) {
      setError(`Error al leer el archivo: ${err.message}`);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(worksheet);

      const leadsPayload = rows.map((row) => ({
        fields: {
          razonSocial: row.razonSocial || '',
          rutEmpresa: row.rutEmpresa || '',
          nombreContacto: row.nombreContacto || '',
          correo: row.correo || '',
          telefono: row.telefono || '',
        },
        executiveEmail: row.executiveEmail || null,
      }));

      const res = await LeadsService.bulkImport({ leads: leadsPayload });

      if (res?.success) {
        setResult({
          success: true,
          message: res.message,
          count: res.data?.count,
          errors: res.data?.errors,
        });
        setTimeout(() => {
          onClose();
          setFile(null);
          setPreview(null);
          setResult(null);
          onSuccess?.();
        }, 2000);
      } else {
        setError(res?.message || 'Error al importar');
      }
    } catch (err) {
      setError(`Error al procesar: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-2xl rounded-xl border border-slate-700 bg-slate-900 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 sticky top-0 bg-slate-900">
          <h2 className="text-lg font-semibold">Importar Leads desde Excel</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* File upload */}
          {!result && (
            <>
              <div className="border-2 border-dashed border-slate-700 rounded-lg p-6 text-center cursor-pointer hover:border-slate-600 transition">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-input"
                  disabled={loading}
                />
                <label htmlFor="file-input" className="cursor-pointer flex flex-col items-center gap-2">
                  <Upload className="w-8 h-8 text-slate-400" />
                  <span className="text-sm text-slate-300">
                    {file ? file.name : 'Selecciona un archivo Excel (.xlsx, .xls, .csv)'}
                  </span>
                  <span className="text-xs text-slate-500">o arrastra aquí</span>
                </label>
              </div>

              {/* Format info */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded px-3 py-2 text-xs text-blue-300">
                <strong>Formato requerido:</strong>
                <ul className="mt-1 space-y-0.5">
                  {REQUIRED_COLUMNS.map((col) => (
                    <li key={col}>✓ {col} (obligatorio)</li>
                  ))}
                  <li>✓ executiveEmail (opcional - asigna a ejecutivo)</li>
                </ul>
              </div>

              {/* Preview */}
              {preview && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Preview ({preview.total} leads)</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="text-left py-1 px-2 text-slate-400">Razón Social</th>
                          <th className="text-left py-1 px-2 text-slate-400">RUT</th>
                          <th className="text-left py-1 px-2 text-slate-400">Contacto</th>
                          <th className="text-left py-1 px-2 text-slate-400">Email</th>
                          <th className="text-left py-1 px-2 text-slate-400">Ejecutivo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.rows.map((row, i) => (
                          <tr key={i} className="border-b border-slate-800">
                            <td className="py-1 px-2">{row.razonSocial}</td>
                            <td className="py-1 px-2">{row.rutEmpresa}</td>
                            <td className="py-1 px-2">{row.nombreContacto}</td>
                            <td className="py-1 px-2 text-slate-500 text-xs">{row.correo}</td>
                            <td className="py-1 px-2 text-slate-500 text-xs">{row.executiveEmail || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {preview.hasMore && (
                      <p className="text-xs text-slate-400 mt-1">+ {preview.total - 5} más...</p>
                    )}
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded px-3 py-2 text-sm text-red-300 flex gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 border-t border-slate-800 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleImport}
                  disabled={!file || loading}
                  className="flex-1"
                >
                  {loading ? 'Importando…' : 'Importar'}
                </Button>
              </div>
            </>
          )}

          {/* Success Result */}
          {result && result.success && (
            <div className="text-center py-8">
              <div className="flex justify-center mb-4">
                <Check className="w-12 h-12 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-emerald-400 mb-2">¡Importación exitosa!</h3>
              <p className="text-sm text-slate-300 mb-4">{result.message}</p>
              {result.errors && result.errors.length > 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded px-3 py-2 text-xs text-yellow-300 text-left">
                  <strong>Advertencias:</strong>
                  <ul className="mt-1 space-y-0.5">
                    {result.errors.map((err, i) => (
                      <li key={i}>Fila {err.row}: {err.error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeadImportModal;
