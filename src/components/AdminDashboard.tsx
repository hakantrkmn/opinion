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
import { useAuth } from "@/contexts/AuthContext";
import {
  BarChart3,
  MapPin,
  MessageCircle,
  RefreshCw,
  Trash2,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface User {
  id: string;
  email: string;
  created_at: string;
}

interface Pin {
  id: string;
  name: string;
  location: string;
  created_at: string;
  profiles: {
    id: string;
    email: string;
    created_at: string;
  };
}

interface Comment {
  id: string;
  text: string;
  created_at: string;
  profiles: {
    id: string;
    email: string;
    created_at: string;
  };
  pins: {
    id: string;
    name: string;
    location: string;
  };
}

interface Analytics {
  totalUsers: number;
  totalPins: number;
  totalComments: number;
  recentPins: Array<{ created_at: string }>;
  recentComments: Array<{ created_at: string }>;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [pins, setPins] = useState<Pin[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("analytics");

  const fetchData = async () => {
    if (!user?.email) return;

    setLoading(true);
    try {
      const headers = {
        "x-user-email": user.email,
      };

      const [usersRes, pinsRes, commentsRes, analyticsRes] = await Promise.all([
        fetch("/api/admin/users", { headers }),
        fetch("/api/admin/pins", { headers }),
        fetch("/api/admin/comments", { headers }),
        fetch("/api/admin/analytics", { headers }),
      ]);

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.data || []);
      }

      if (pinsRes.ok) {
        const pinsData = await pinsRes.json();
        setPins(pinsData.data || []);
      }

      if (commentsRes.ok) {
        const commentsData = await commentsRes.json();
        setComments(commentsData.data || []);
      }

      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        setAnalytics(analyticsData.data);
      }
    } catch (error) {
      console.error("Failed to fetch admin data:", error);
      toast.error("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeletePin = async (pinId: string) => {
    if (!confirm("Are you sure you want to delete this pin?")) return;
    if (!user?.email) return;

    try {
      const response = await fetch(`/api/admin/pins/${pinId}`, {
        method: "DELETE",
        headers: {
          "x-user-email": user.email,
        },
      });

      if (response.ok) {
        setPins(pins.filter((pin) => pin.id !== pinId));
        toast.success("Pin deleted successfully");
      } else {
        toast.error("Failed to delete pin");
      }
    } catch (error) {
      console.error("Delete pin error:", error);
      toast.error("Failed to delete pin");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;
    if (!user?.email) return;

    try {
      const response = await fetch(`/api/admin/comments/${commentId}`, {
        method: "DELETE",
        headers: {
          "x-user-email": user.email,
        },
      });

      if (response.ok) {
        setComments(comments.filter((comment) => comment.id !== commentId));
        toast.success("Comment deleted successfully");
      } else {
        toast.error("Failed to delete comment");
      }
    } catch (error) {
      console.error("Delete comment error:", error);
      toast.error("Failed to delete comment");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this user? This will delete all their pins and comments."
      )
    )
      return;
    if (!user?.email) return;

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: {
          "x-user-email": user.email,
        },
      });

      if (response.ok) {
        setUsers(users.filter((user) => user.id !== userId));
        // Also remove their pins and comments from the lists
        setPins(pins.filter((pin) => pin.profiles.id !== userId));
        setComments(
          comments.filter((comment) => comment.profiles.id !== userId)
        );
        toast.success("User deleted successfully");
      } else {
        toast.error("Failed to delete user");
      }
    } catch (error) {
      console.error("Delete user error:", error);
      toast.error("Failed to delete user");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage users, pins, and comments
          </p>
        </div>
        <Button onClick={fetchData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" />
            Users ({users.length})
          </TabsTrigger>
          <TabsTrigger value="pins">
            <MapPin className="h-4 w-4 mr-2" />
            Pins ({pins.length})
          </TabsTrigger>
          <TabsTrigger value="comments">
            <MessageCircle className="h-4 w-4 mr-2" />
            Comments ({comments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-6">
          {analytics && (
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Users
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.totalUsers}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Pins
                  </CardTitle>
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.totalPins}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Comments
                  </CardTitle>
                  <MessageCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.totalComments}
                  </div>
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
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{user.email}</p>
                      <p className="text-sm text-muted-foreground">
                        Joined: {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteUser(user.id)}
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
                {pins.map((pin) => (
                  <div
                    key={pin.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{pin.name}</p>
                      <p className="text-sm text-muted-foreground">
                        By: {pin.profiles.email}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Created: {new Date(pin.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeletePin(pin.id)}
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
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="flex items-start justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="text-sm">{comment.text}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary">
                          {comment.profiles.email}
                        </Badge>
                        <Badge variant="outline">{comment.pins.name}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteComment(comment.id)}
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
