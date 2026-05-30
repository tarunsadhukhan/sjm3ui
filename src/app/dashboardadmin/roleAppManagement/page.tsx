"use client";

import { SearchablePaginatedTable } from "@/components/ui/searchablePaginatedTable";
import { Column } from "@/components/ui/datatablewithedit";
import { Button } from "@/components/ui/button";
import { PencilIcon } from "lucide-react";

import { apiRoutes } from "@/utils/api";
import { fetchWithCookie } from "@/utils/apiClient2";

type Role = {
  role_id: number;
  role_name: string;
  active: boolean | number;
};

const fetchRoles = async (page: number, search?: string) => {
  const limit = 20;
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (search) {
    queryParams.append("search", search);
  }

  const { data, error } = await fetchWithCookie(
    `${apiRoutes.ROLES_APP}?${queryParams}`,
    "GET"
  );

  if (error || !data) {
    throw new Error(error || "Failed to fetch roles");
  }
  return data;
};

const columns: Column<Role>[] = [
  {
    key: "role_name",
    label: "Role Name",
    className: "bg-[#3ea6da] text-white font-medium",
  },
  {
    key: "active",
    label: "Active",
    className: "bg-[#3ea6da] text-white",
    render: (val) => (val === 1 || val === true ? "Yes" : "No"),
  },
  {
    key: "actions",
    label: "Actions",
    className: "bg-[#3ea6da] text-white",
    render: (_val, row) => (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          window.location.href = `/dashboardadmin/roleAppManagement/createRoleApp?roleId=${row.role_id}`;
        }}
      >
        <PencilIcon className="h-4 w-4" />
      </Button>
    ),
  },
];

export default function RoleAppManagementPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#0C3C60]">Role &amp; Menu Mapping</h1>
          <Button
            className="bg-[#95C11F] hover:bg-[#85ad1b] text-white"
            onClick={() => {
              window.location.href = "/dashboardadmin/roleAppManagement/createRoleApp";
            }}
          >
            + Create Role
          </Button>
        </div>

        <SearchablePaginatedTable columns={columns} fetchFn={fetchRoles} />
      </div>
    </div>
  );
}
