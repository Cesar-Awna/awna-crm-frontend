import { useState, useCallback } from 'react';

/**
 * Custom hook for pagination state management
 * @param {number} initialPage - Initial page (default: 1)
 * @param {number} initialLimit - Initial limit (default: 20)
 * @returns {Object} Pagination state and handlers
 */
export const usePagination = (initialPage = 1, initialLimit = 20) => {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);
  const [totalPages, setTotalPages] = useState(0);
  const [totalDocs, setTotalDocs] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);

  const updatePaginationData = useCallback((pagination) => {
    if (pagination) {
      setTotalPages(pagination.totalPages || 0);
      setTotalDocs(pagination.totalDocs || 0);
      setHasNextPage(pagination.hasNextPage || false);
      setHasPrevPage(pagination.hasPrevPage || false);
    }
  }, []);

  const goToPage = useCallback((page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);

  const goToNextPage = useCallback(() => {
    if (hasNextPage) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [hasNextPage]);

  const goToPrevPage = useCallback(() => {
    if (hasPrevPage) {
      setCurrentPage((prev) => Math.max(prev - 1, 1));
    }
  }, [hasPrevPage]);

  const changeLimit = useCallback((newLimit) => {
    if (newLimit > 0 && newLimit <= 100) {
      setLimit(newLimit);
      setCurrentPage(1); // Reset to first page
    }
  }, []);

  const reset = useCallback(() => {
    setCurrentPage(1);
    setLimit(20);
    setTotalPages(0);
    setTotalDocs(0);
    setHasNextPage(false);
    setHasPrevPage(false);
  }, []);

  return {
    currentPage,
    limit,
    totalPages,
    totalDocs,
    hasNextPage,
    hasPrevPage,
    goToPage,
    goToNextPage,
    goToPrevPage,
    changeLimit,
    updatePaginationData,
    reset,
  };
};
