import {
  DataGrid,
  GridColDef,
  GridColumnGroupingModel,
  GridPaginationModel,
  GridRowsProp,
  GridFilterModel,
  GridSortModel,
  GridRowClassNameParams,
} from '@mui/x-data-grid';
import { Box, SxProps, Theme } from '@mui/material';
import React, { useState, useEffect } from 'react';

interface MuiDataGridProps {
  rows: GridRowsProp;
  columns: GridColDef[];
  rowCount: number;
  onPaginationModelChange: (model: GridPaginationModel) => void;
  loading?: boolean;
  paginationModel?: GridPaginationModel;
  pageSizeOptions?: number[];
  paginationMode?: 'client' | 'server';
  disableRowSelectionOnClick?: boolean;
  showLoadingUntilLoaded?: boolean;
  // Toolbar and filtering props
  showToolbar?: boolean;
  filterMode?: 'client' | 'server';
  sortingMode?: 'client' | 'server';
  filterModel?: GridFilterModel;
  onFilterModelChange?: (model: GridFilterModel) => void;
  sortModel?: GridSortModel;
  onSortModelChange?: (model: GridSortModel) => void;
  // Column features
  disableColumnFilter?: boolean;
  disableColumnSelector?: boolean;
  disableDensitySelector?: boolean;
  disableExport?: boolean;
  // Row styling
  getRowClassName?: (params: GridRowClassNameParams) => string;
  extraSx?: SxProps<Theme>;
  // Multi-level header grouping
  columnGroupingModel?: GridColumnGroupingModel;
}

const MuiDataGrid: React.FC<MuiDataGridProps> = ({
  rows,
  columns,
  rowCount,
  onPaginationModelChange,
  loading = false,
  paginationModel = { page: 0, pageSize: 10 },
  pageSizeOptions = [10, 20, 25, 50, 100],
  paginationMode = 'server',
  disableRowSelectionOnClick = true,
  showLoadingUntilLoaded = false,
  // Toolbar and filtering props
  showToolbar = false,
  filterMode = 'client',
  sortingMode = 'client',
  filterModel,
  onFilterModelChange,
  sortModel,
  onSortModelChange,
  // Column features
  disableColumnFilter = false,
  disableColumnSelector = false,
  disableDensitySelector = false,
  disableExport = false,
  getRowClassName,
  extraSx,
  columnGroupingModel,
}) => {
  // Ensure component is mounted before rendering DataGrid to avoid
  // "Can't perform a React state update on a component that hasn't mounted yet"
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Render empty placeholder with same dimensions to avoid hydration mismatch
  // The placeholder must be identical on server and client for initial render
  if (!isMounted) {
    return (
      <Box 
        sx={{ 
          height: 500, 
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        suppressHydrationWarning
      />
    );
  }

  return (
    <Box sx={{
      height: 500,
      width: '100%',
      '& .MuiDataGrid-root': {
        border: 'none',
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
      },
      '& .MuiDataGrid-cell:focus': {
        outline: 'none'
      }
    }}>
      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id ?? row.co_id}
        loading={showLoadingUntilLoaded ? loading : false}
        paginationMode={paginationMode}
        paginationModel={paginationModel}
        onPaginationModelChange={onPaginationModelChange}
        pageSizeOptions={pageSizeOptions}
        rowCount={rowCount}
        disableRowSelectionOnClick={disableRowSelectionOnClick}
        pagination
        // Use the new showToolbar prop instead of deprecated GridToolbar
        showToolbar={showToolbar}
        // Filtering
        filterMode={filterMode}
        filterModel={filterModel}
        onFilterModelChange={onFilterModelChange}
        // Sorting
        sortingMode={sortingMode}
        sortModel={sortModel}
        onSortModelChange={onSortModelChange}
        // Column features
        disableColumnFilter={disableColumnFilter}
        disableColumnSelector={disableColumnSelector}
        disableDensitySelector={disableDensitySelector}
        getRowClassName={getRowClassName}
        columnGroupingModel={columnGroupingModel}
        sx={{
          '& .MuiDataGrid-columnHeader': {
            backgroundColor: '#3ea6da',
            color: 'white',
            fontWeight: 'bold',
          },
          '& .MuiDataGrid-columnHeaderTitle': {
            fontWeight: 'bold',
          },
          '& .MuiDataGrid-toolbarContainer': {
            padding: '8px 16px',
            gap: '8px',
          },
          ...(extraSx || {}),
        }}
      />
    </Box>
  );
};

export default MuiDataGrid;
