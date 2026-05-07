import React from 'react';
import { Button } from './ui/button.jsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Reusable pagination controls component
 * @param {Object} props - Component props
 * @param {number} props.currentPage - Current page
 * @param {number} props.totalPages - Total pages
 * @param {number} props.limit - Items per page
 * @param {number} props.totalDocs - Total documents
 * @param {boolean} props.hasNextPage - Has next page
 * @param {boolean} props.hasPrevPage - Has previous page
 * @param {function} props.onPageChange - Callback when page changes
 * @param {function} props.onLimitChange - Callback when limit changes
 */
const PaginationControls = ({
  currentPage = 1,
  totalPages = 0,
  limit = 20,
  totalDocs = 0,
  hasNextPage = false,
  hasPrevPage = false,
  onPageChange = () => {},
  onLimitChange = () => {},
}) => {
  const startDoc = (currentPage - 1) * limit + 1;
  const endDoc = Math.min(currentPage * limit, totalDocs);

  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col gap-4 border-t border-slate-700 pt-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Info */}
      <div className="text-xs text-slate-400">
        {totalDocs > 0 ? (
          <>
            Mostrando{' '}
            <span className="font-semibold text-slate-200">
              {startDoc}–{endDoc}
            </span>{' '}
            de <span className="font-semibold text-slate-200">{totalDocs}</span> resultados
          </>
        ) : (
          'No hay resultados'
        )}
      </div>

      {/* Limit selector */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-slate-400">Por página:</label>
        <select
          value={limit}
          onChange={(e) => onLimitChange(Number(e.target.value))}
          className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-50"
        >
          <option value="10">10</option>
          <option value="20">20</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!hasPrevPage}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Página anterior"
        >
          <ChevronLeft size={16} />
        </Button>

        {/* Page numbers */}
        <div className="flex gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((page) => {
              const range = 2;
              return (
                page === 1 ||
                page === totalPages ||
                (page >= currentPage - range && page <= currentPage + range)
              );
            })
            .map((page, idx, arr) => (
              <React.Fragment key={page}>
                {idx > 0 && arr[idx - 1] !== page - 1 && (
                  <span className="px-1 text-slate-500">…</span>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant={page === currentPage ? 'default' : 'outline'}
                  onClick={() => onPageChange(page)}
                  className="min-w-8"
                >
                  {page}
                </Button>
              </React.Fragment>
            ))}
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!hasNextPage}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Página siguiente"
        >
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
};

export default PaginationControls;
