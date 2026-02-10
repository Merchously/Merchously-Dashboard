"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShieldCheck, UserX, Clock } from "lucide-react";
import { useSSE } from "@/lib/hooks/use-sse";
import { ROLES, ROLE_LABELS, type UserRole } from "@/lib/roles";

interface PendingUser {
  id: string;
  username: string;
  display_name: string;
  role: UserRole;
  created_at: string;
}

export default function UserApprovalsPage() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>(
    {}
  );
  const [roleOverrides, setRoleOverrides] = useState<Record<string, string>>(
    {}
  );

  const fetchPending = () => {
    fetch("/api/users/pending")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setPendingUsers(data.users);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPending();
  }, []);

  useSSE("/api/events", {
    onMessage: (event: any) => {
      if (
        event.type === "user.signup_pending" ||
        event.type === "user.approved" ||
        event.type === "user.rejected"
      ) {
        fetchPending();
      }
    },
  });

  const handleAction = async (userId: string, action: "approve" | "reject") => {
    if (action === "reject") {
      const confirmed = window.confirm(
        "Are you sure you want to reject this user? Their account will be permanently deleted."
      );
      if (!confirmed) return;
    }

    setActionLoading((prev) => ({ ...prev, [userId]: true }));

    try {
      const body: { action: string; roleOverride?: string } = { action };
      if (action === "approve" && roleOverrides[userId]) {
        body.roleOverride = roleOverrides[userId];
      }

      const res = await fetch(`/api/users/${userId}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        fetchPending();
      }
    } catch (error) {
      console.error("Error processing user action:", error);
    } finally {
      setActionLoading((prev) => ({ ...prev, [userId]: false }));
    }
  };

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
          User Approvals
        </h2>
        <p className="text-muted-foreground mt-1">
          Review and approve new user signups.
          {pendingUsers.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {pendingUsers.length} pending
            </Badge>
          )}
        </p>
      </div>

      {pendingUsers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ShieldCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No pending signups</p>
            <p className="text-sm mt-1">
              New user registrations will appear here for your approval.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending Registrations</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {pendingUsers.map((user) => (
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
                        <p className="font-medium">{user.display_name}</p>
                        <p className="text-sm text-muted-foreground">
                          @{user.username}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2 ml-12">
                      <Badge variant="outline">
                        {ROLE_LABELS[user.role] || user.role}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(user.created_at).toLocaleDateString()}{" "}
                        {new Date(user.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Select
                      value={roleOverrides[user.id] || ""}
                      onValueChange={(val) =>
                        setRoleOverrides((prev) => ({
                          ...prev,
                          [user.id]: val,
                        }))
                      }
                    >
                      <SelectTrigger className="w-[180px] text-xs">
                        <SelectValue placeholder="Override role..." />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      size="sm"
                      onClick={() => handleAction(user.id, "approve")}
                      disabled={actionLoading[user.id]}
                    >
                      {actionLoading[user.id] ? "..." : "Approve"}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleAction(user.id, "reject")}
                      disabled={actionLoading[user.id]}
                    >
                      <UserX className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
