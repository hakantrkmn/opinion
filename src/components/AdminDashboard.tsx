"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useAdminUsers,
  useAdminPins,
  useAdminComments,
  useAdminAnalytics,
} from "@/hooks/queries/use-admin";
import {
  useDeleteAdminUser,
  useDeleteAdminPin,
  useDeleteAdminComment,
  useRefreshStats,
} from "@/hooks/mutations/use-admin-mutations";
import {
  BarChart3,
  MapPin,
  MessageCircle,
  RefreshCw,
  Trash2,
  Users,
} from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/query-keys";

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  createdAt?: string;
}

interface AdminPin {
  id: string;
  name: string;
  location: string;
  created_at: string;
  profiles: { id: string; email: string };
}

interface AdminComment {
  id: string;
  text: string;
  created_at: string;
  profiles: { id: string; email: string };
  pins: { id: string; name: string; location: string };
}

interface AdminAnalytics {
  totalUsers: number;
  totalPins: number;
  totalComments: number;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("analytics");
  const queryClient = useQueryClient();

  // Queries
  const { data: usersResponse, isLoading: usersLoading } = useAdminUsers();
  const { data: pinsResponse, isLoading: pinsLoading } = useAdminPins();
  const { data: commentsResponse, isLoading: commentsLoading } = useAdminComments();
  const { data: analytics, isLoading: analyticsLoading } = useAdminAnalytics();

  const users = usersResponse?.data || [];
  const pins = pinsResponse?.data || [];
  const comments = commentsResponse?.data || [];

  // Mutations
  const deleteUserMutation = useDeleteAdminUser();
  const deletePinMutation = useDeleteAdminPin();
  const deleteCommentMutation = useDeleteAdminComment();
  const refreshStatsMutation = useRefreshStats();

  const loading = usersLoading || pinsLoading || commentsLoading || analyticsLoading;

  const handleRefreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "pins"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "comments"] });
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.analytics });
  };

  const handleDeletePin = (pinId: string) => {
    if (!confirm("Are you sure you want to delete this pin?")) return;
    deletePinMutation.mutate(pinId);
  };

  const handleDeleteComment = (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;
    deleteCommentMutation.mutate(commentId);
  };

  const handleDeleteUser = (userId: string) => {
    if (!confirm("Are you sure you want to delete this user? This will delete all their pins and comments.")) return;
    deleteUserMutation.mutate(userId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const typedUsers = users as AdminUser[];
  const typedPins = pins as AdminPin[];
  const typedComments = comments as AdminComment[];
  const typedAnalytics = analytics as AdminAnalytics | undefined;

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage users, pins, and comments
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => refreshStatsMutation.mutate()}
            variant="outline"
            disabled={refreshStatsMutation.isPending}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Refresh Stats
          </Button>
          <Button onClick={handleRefreshAll} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" />
            Users ({typedUsers.length})
          </TabsTrigger>
          <TabsTrigger value="pins">
            <MapPin className="h-4 w-4 mr-2" />
            Pins ({typedPins.length})
          </TabsTrigger>
          <TabsTrigger value="comments">
            <MessageCircle className="h-4 w-4 mr-2" />
            Comments ({typedComments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-6">
          {typedAnalytics && (
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{typedAnalytics.totalUsers}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Pins</CardTitle>
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{typedAnalytics.totalPins}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Comments</CardTitle>
                  <MessageCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{typedAnalytics.totalComments}</div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
              <CardDescription>Manage registered users</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {typedUsers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{u.email}</p>
                      <p className="text-sm text-muted-foreground">
                        Joined: {new Date(u.created_at || u.createdAt || "").toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteUser(u.id)}
                      disabled={deleteUserMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pins" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Pins</CardTitle>
              <CardDescription>Manage map pins</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {typedPins.map((pin) => (
                  <div key={pin.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{pin.name}</p>
                      <p className="text-sm text-muted-foreground">
                        By: {pin.profiles?.email}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Created: {new Date(pin.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeletePin(pin.id)}
                      disabled={deletePinMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Comments</CardTitle>
              <CardDescription>Manage user comments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {typedComments.map((comment) => (
                  <div key={comment.id} className="flex items-start justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm">{comment.text}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary">{comment.profiles?.email}</Badge>
                        <Badge variant="outline">{comment.pins?.name}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteComment(comment.id)}
                      disabled={deleteCommentMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
