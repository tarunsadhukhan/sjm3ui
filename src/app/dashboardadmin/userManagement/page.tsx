"use client";

import React, { useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Snackbar, Alert } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { useUserList } from "./hooks/useUserList";
import type { User } from "./types";

export default function UserManagementPage() {
  const router = useRouter();
  const {
    rows,
    totalRows,
    loading,
    error,
    paginationModel,
    handlePaginationModelChange,
    searchValue,
    handleSearchChange,
  } = useUserList();

  const [snackbar, setSnackbar] = React.useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  // Show error in snackbar when it occurs
  React.useEffect(() => {
    if (error) {
      setSnackbar({
        open: true,
        message: error,
        severity: "error",
      });
    }
  }, [error]);

  const handleEdit = useCallback(
    (row: User) => {
      router.push(`/dashboardadmin/userManagement/CreateUser?userId=${row.user_id}`);
    },
    [router]
  );

  const handleCreate = useCallback(() => {
    router.push("/dashboardadmin/userManagement/CreateUser");
  }, [router]);

  const columns = useMemo<GridColDef<User>[]>(
    () => [
      {
        field: "name",
        headerName: "Name",
        flex: 1,
        minWidth: 150,
      },
      {
        field: "email_id",
        headerName: "Username",
        flex: 1,
        minWidth: 200,
      },
      {
        field: "active",
        headerName: "Active",
        width: 100,
        valueGetter: (value: number) => (value === 1 ? "Yes" : "No"),
      },
    ],
    []
  );

  const handleCloseSnackbar = useCallback(() => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  }, []);

  return (
    <IndexWrapper
      title="User Management Portal"
      subtitle="Manage portal users and their branch/role assignments"
      rows={rows}
      columns={columns}
      rowCount={totalRows}
      paginationModel={paginationModel}
      onPaginationModelChange={handlePaginationModelChange}
      loading={loading}
      showLoadingUntilLoaded
      search={{
        value: searchValue,
        onChange: handleSearchChange,
        placeholder: "Search users...",
        debounceDelayMs: 1000,
      }}
      createAction={{
        label: "+ Create User",
        onClick: handleCreate,
      }}
      onEdit={handleEdit}
    >
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={handleCloseSnackbar}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </IndexWrapper>
  );
}
