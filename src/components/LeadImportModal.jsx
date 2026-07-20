import React, { useState } from 'react';
import { Upload, Check, AlertCircle, ArrowRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from './ui/button.jsx';
import LeadsService from '../services/Leads.js';

const CRM_FIELDS = [
  { key: 'rutEmpresa',     label: 'RUT Empresa',     required: true },
  { key: 'razonSocial',    label: 'Razón Social',     required: true },
  { key: 'nombreContacto', label: 'Nombre contacto',  required: false },
  { key: 'correo',         label: 'Correo',           required: false },
  { key: 'telefono',       label: 'Teléfono',         required: false },
];

const autoSuggest = (col) => {
  const c = col.toUpperCase();
  if (c.includes('RUTID') || (c.includes('RUT') && !c.includes('RAZON'))) return 'rutEmpresa';
  if (c.includes('RAZON') || c.includes('RAZÓN') || c.includes('SOCIAL')) return 'razonSocial';
  if (c.includes('EMAIL') || c.includes('CORREO') || c.includes('MAIL')) return 'correo';
  if (c.includes('CELULAR') || c.includes('TELEFONO') || c.includes('TELÉFONO')) return 'telefono';
  if (c.includes('CARGO') || (c.includes('CONTACTO') && c.includes('NOMBRE'))) return 'nombreContacto';
  return '__ignore__';
};

const LeadImportModal = ({ isOpen, onClose, onSuccess, skipAssign = false }) => {
  const [step, setStep] = useState('upload');
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [mapping, setMapping] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const reset = () => {
    setStep('upload');
    setRows([]);
    setColumns([]);
    setMapping({});
    setLoading(false);
    setResult(null);
    setError(null);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setError(null);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const parsed = XLSX.utils.sheet_to_json(worksheet);
      if (parsed.length === 0) { setError('El archivo está vacío'); return; }

      const cols = Object.keys(parsed[0]);
      const initialMapping = {};
      cols.forEach((col) => { initialMapping[col] = autoSuggest(col); });

      setRows(parsed);
      setColumns(cols);
      setMapping(initialMapping);
      setStep('mapping');
    } catch (err) {
      setError(`Error al leer el archivo: ${err.message}`);
    }
  };

  const handleImport = async () => {
    const mappedFields = Object.values(mapping);
    if (!mappedFields.includes('rutEmpresa')) {
      setError('Debes asignar el campo "RUT Empresa"');
      return;
    }
    if (!mappedFields.includes('razonSocial')) {
      setError('Debes asignar el campo "Razón Social"');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const leadsPayload = rows.map((row) => {
        const lead = {};
        Object.entries(mapping).forEach(([excelCol, crmField]) => {
          if (crmField !== '__ignore__') {
            lead[crmField] = String(row[excelCol] ?? '').trim();
          }
        });
        return lead;
      });

      const res = await LeadsService.bulkImport({ leads: leadsPayload, skipAssign });
      if (res?.success) {
        setResult({ success: true, message: res.message, count: res.data?.count, errors: res.data?.errors });
        setTimeout(() => { handleClose(); onSuccess?.(); }, 2500);
      } else {
        setError(res?.message || 'Error al importar');
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-2xl rounded-xl border border-slate-700 bg-slate-900 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-800 bg-slate-900 px-6 py-4">
          <h2 className="text-lg font-semibold">Importar Leads desde Excel</h2>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-200 text-2xl leading-none">×</button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Step indicator */}
          <div className="flex items-center gap-2 text-xs">
            {[['upload', '1. Subir archivo'], ['mapping', '2. Mapear columnas'], ['done', '3. Listo']].map(([s, label], i, arr) => (
              <React.Fragment key={s}>
                <span className={step === s || (step === 'mapping' && s === 'upload') || (result && s !== 'upload')
                  ? step === s ? 'text-sky-400 font-medium' : 'text-slate-500'
                  : 'text-slate-600'}>
                  {label}
                </span>
                {i < arr.length - 1 && <span className="text-slate-600">→</span>}
              </React.Fragment>
            ))}
          </div>

          {/* STEP 1: Upload */}
          {step === 'upload' && (
            <>
              <label
                htmlFor="file-input"
                className="flex flex-col items-center gap-3 cursor-pointer rounded-lg border-2 border-dashed border-slate-700 p-10 text-center hover:border-slate-500 transition"
              >
                <Upload className="w-10 h-10 text-slate-400" />
                <span className="text-sm text-slate-300">Selecciona o arrastra tu archivo Excel</span>
                <span className="text-xs text-slate-500">.xlsx, .xls, .csv — cualquier formato</span>
                <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} className="hidden" id="file-input" />
              </label>
              <div className="rounded bg-blue-500/10 border border-blue-500/30 px-3 py-2 text-xs text-blue-300">
                En el siguiente paso podrás indicar qué columna de tu Excel corresponde a cada campo del CRM.
              </div>
              {error && (
                <div className="flex gap-2 rounded bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
            </>
          )}

          {/* STEP 2: Column mapping */}
          {step === 'mapping' && !result && (
            <>
              <p className="text-sm text-slate-400">
                <span className="font-medium text-slate-200">{rows.length} filas</span> detectadas.
                Asigna cada columna del Excel al campo del CRM correspondiente.
              </p>

              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-3 pb-1 text-xs text-slate-500 font-medium uppercase tracking-wide">
                  <span>Columna en el Excel</span>
                  <span>Campo en el CRM</span>
                </div>
                {columns.map((col) => (
                  <div key={col} className="grid grid-cols-2 gap-3 items-center">
                    <div className="rounded bg-slate-800 px-3 py-2 text-xs text-slate-300 font-mono truncate">
                      {col}
                    </div>
                    <select
                      className="h-9 rounded-md border border-slate-700 bg-slate-900 px-2 text-sm text-slate-50"
                      value={mapping[col] || '__ignore__'}
                      onChange={(e) => setMapping((prev) => ({ ...prev, [col]: e.target.value }))}
                    >
                      <option value="__ignore__">(ignorar)</option>
                      {CRM_FIELDS.map((f) => (
                        <option key={f.key} value={f.key}>
                          {f.label}{f.required ? ' *' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500">* obligatorios: RUT Empresa y Razón Social</p>

              {error && (
                <div className="flex gap-2 rounded bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-2 border-t border-slate-800 pt-4">
                <Button type="button" variant="outline" onClick={() => { setStep('upload'); setError(null); }} className="flex-1" disabled={loading}>
                  Atrás
                </Button>
                <Button type="button" onClick={handleImport} disabled={loading} className="flex-1">
                  {loading ? 'Importando…' : `Importar ${rows.length} leads`}
                </Button>
              </div>
            </>
          )}

          {/* STEP 3: Result */}
          {result?.success && (
            <div className="py-10 text-center">
              <div className="flex justify-center mb-4">
                <Check className="w-12 h-12 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-emerald-400 mb-2">¡Importación exitosa!</h3>
              <p className="text-sm text-slate-300">{result.message}</p>
              {result.errors?.length > 0 && (
                <div className="mt-4 rounded bg-yellow-500/10 border border-yellow-500/30 px-3 py-2 text-xs text-yellow-300 text-left">
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
