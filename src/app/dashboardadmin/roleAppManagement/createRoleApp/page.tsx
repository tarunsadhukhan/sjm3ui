'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useForm } from "react-hook-form";
import { useSearchParams, useRouter } from 'next/navigation';

import { apiRoutes } from "@/utils/api";
import { fetchWithCookie } from '@/utils/apiClient2';

import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import MenuAccessTree, { AppMenuItem, MenuAccess } from "./_components/MenuAccessTree";

const fetchMenu = async (roleId: string | null): Promise<{ data: AppMenuItem[]; roleName?: string }> => {
    const apiUrl = roleId ? `${apiRoutes.GET_APP_MENU_BY_ROLEID}/${roleId}` : apiRoutes.APP_MENU_FULL;

    const { data, error } = await fetchWithCookie(apiUrl);

    if (error || !data) throw new Error(error || "Failed to fetch menu");

    return data as { data: AppMenuItem[]; roleName?: string };
};

function LoadingFallback() {
    return <div className="p-6">Loading role data...</div>;
}

function CreateRoleAppContent() {
    const searchParams = useSearchParams();
    const roleId = searchParams.get('roleId');
    const router = useRouter();
    const [menuData, setMenuData] = useState<AppMenuItem[]>([]);
    const [roleName, setRoleName] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [menuAccessList, setMenuAccessList] = useState<MenuAccess[]>([]);

    useEffect(() => {
        const fetchMenuData = async () => {
            setLoading(true);
            setFetchError(null);
            try {
                const response = await fetchMenu(roleId);
                setMenuData(Array.isArray(response.data) ? response.data : []);
                setRoleName(response.roleName ?? "");
            } catch (err) {
                setFetchError(err instanceof Error ? err.message : "An unknown error occurred");
                setMenuData([]);
                setRoleName("");
            } finally {
                setLoading(false);
            }
        };

        fetchMenuData();
    }, [roleId]);

    const form = useForm({
        defaultValues: { name: '' },
        values: { name: roleName },
    });

    const onSubmit = async () => {
        if (!roleId && !roleName.trim()) {
            setFetchError("Role name is required");
            return;
        }

        const payload = roleId
            ? { roleId: Number(roleId), menuAccessList }
            : { roleName: roleName.trim(), menuAccessList };

        try {
            setSaving(true);
            setFetchError(null);

            const apiUrl = roleId ? apiRoutes.EDIT_ROLE_APP : apiRoutes.CREATE_ROLE_APP;
            const method = roleId ? "PUT" : "POST";

            const response = await fetchWithCookie(apiUrl, method, payload);

            if (response.error) {
                throw new Error(response.error);
            }

            router.push("/dashboardadmin/roleAppManagement");
        } catch (error) {
            setFetchError(error instanceof Error ? error.message : "Failed to save role");
        } finally {
            setSaving(false);
        }
    };

    return (
        <main className="p-6">
            <h1 className="text-xl font-bold mb-4">
                {roleId ? 'Edit Role Mapping' : 'Create Role Mapping'}
            </h1>
            <div className="mb-4">
                <Card className="p-6">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Role Name</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Enter role name"
                                                {...field}
                                                value={roleName}
                                                onChange={(e) => setRoleName(e.target.value)}
                                                readOnly={!!roleId}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="flex justify-end space-x-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => router.push("/dashboardadmin/roleAppManagement")}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="bg-[#9BC837] hover:bg-[#8BB72E] text-white"
                                    disabled={saving || loading}
                                >
                                    {saving ? (roleId ? "Updating..." : "Creating...") : (roleId ? "Update Role" : "Create Role")}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </Card>
            </div>
            {loading && <p>Loading menu...</p>}
            {fetchError && <p className="text-red-500">Error: {fetchError}</p>}
            {!loading && !fetchError && (
                <MenuAccessTree menuData={menuData} onChange={setMenuAccessList} />
            )}
        </main>
    );
}

export default function CreateRoleAppPage() {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <CreateRoleAppContent />
        </Suspense>
    );
}
