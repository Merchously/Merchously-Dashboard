"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Pencil,
  KeyRound,
  UserX,
  Trash2,
  UserCheck,
} from "lucide-react";
import { useSSE } from "@/lib/hooks/use-sse";
import { ROLE_LABELS, type UserRole } from "@/lib/roles";
import { EditUserModal } from "@/components/dashboard/edit-user-modal";

interface ManagedUser {
  id: string;
  username: string;
  display_name: string;
  role: UserRole;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export default function UserManagementPage() {
  const [userList, setUserList] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [modalUser, setModalUser] = useState<ManagedUser | null>(null);
  const [modalMode, setModalMode] = useState<"edit" | "reset-password">("edit");
  const [modalOpen, setModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>(
    {}
  );

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setCurrentUserId(data.user.userId);
      })
      .catch(() => {});
  }, []);

  const fetchUsers = useCallback(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setUserList(data.users);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useSSE("/api/events", {
    onMessage: useCallback(
      (event: any) => {
        if (event.type?.startsWith("user.")) fetchUsers();
      },
      [fetchUsers]
    ),
  });

  const openModal = (user: ManagedUser, mode: "edit" | "reset-password") => {
    setModalUser(user);
    setModalMode(mode);
    setModalOpen(true);
  };

  const handleSave = async (userId: string, data: Record<string, any>) => {
    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || "Failed to save");
    fetchUsers();
  };

  const handleToggleActive = async (user: ManagedUser) => {
    const action = user.is_active ? "deactivate" : "reactivate";
    const confirmed = window.confirm(
      `Are you sure you want to ${action} @${user.username}?`
    );
    if (!confirmed) return;

    setActionLoading((prev) => ({ ...prev, [user.id]: true }));
    try {
      await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: user.is_active ? 0 : 1 }),
      });
      fetchUsers();
    } catch (error) {
      console.error(`Error ${action}ing user:`, error);
    } finally {
      setActionLoading((prev) => ({ ...prev, [user.id]: false }));
    }
  };

  const handleDelete = async (user: ManagedUser) => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete @${user.username}? This cannot be undone.`
    );
    if (!confirmed) return;

    setActionLoading((prev) => ({ ...prev, [user.id]: true }));
    try {
      await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
    } finally {
      setActionLoading((prev) => ({ ...prev, [user.id]: false }));
    }
  };

  const isSelf = (userId: string) => userId === currentUserId;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold font-serif tracking-tight">
          User Management
        </h2>
        <p className="text-muted-foreground mt-1">
          Manage team roles, status, and credentials.
          {userList.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {userList.length} users
            </Badge>
          )}
        </p>
      </div>

      {userList.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No users found</p>
            <p className="text-sm mt-1">
              Users will appear here once accounts are created.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">All Users</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {userList.map((user) => (
                <div
                  key={user.id}
                  className="px-6 py-4 flex items-center justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                        {user.display_name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium">
                          {user.display_name}
                          {isSelf(user.id) && (
                            <span className="text-xs text-muted-foreground ml-2">
                              (you)
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          @{user.username}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2 ml-12">
                      <Badge variant="outline">
                        {ROLE_LABELS[user.role] || user.role}
                      </Badge>
                      {user.is_active ? (
                        <Badge
                          variant="secondary"
                          className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        >
                          Active
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                        >
                          Deactivated
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 ml-4">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openModal(user, "edit")}
                      title="Edit user"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openModal(user, "reset-password")}
                      title="Reset password"
                    >
                      <KeyRound className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggleActive(user)}
                      disabled={isSelf(user.id) || actionLoading[user.id]}
                      title={
                        isSelf(user.id)
                          ? "Cannot modify your own account"
                          : user.is_active
                            ? "Deactivate user"
                            : "Reactivate user"
                      }
                    >
                      {user.is_active ? (
                        <UserX className="h-4 w-4" />
                      ) : (
                        <UserCheck className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(user)}
                      disabled={isSelf(user.id) || actionLoading[user.id]}
                      title={
                        isSelf(user.id)
                          ? "Cannot delete your own account"
                          : "Delete user permanently"
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <EditUserModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        user={modalUser}
        mode={modalMode}
        onSave={handleSave}
      />
    </div>
  );
}
