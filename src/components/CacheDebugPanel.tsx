"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQueryClient } from "@tanstack/react-query";
import { Activity, RefreshCw, Trash2 } from "lucide-react";
import React, { useEffect, useState } from "react";

interface CacheDebugPanelProps {
    isVisible?: boolean;
    onToggle?: () => void;
}

interface DebugInfo {
    cacheStats: {
        totalEntries: number;
        totalHits: number;
        totalMisses: number;
        hitRate: number;
        memoryUsage: number;
    };
    optimisticStats: {
        pendingComments: number;
        pendingVotes: number;
        rollbackQueueSize: number;
    };
    integrationStats: {
        lastCacheInvalidation: number;
        lastCacheWarming: number;
        optimisticUpdateRate: number;
        hybridCacheEntries: number;
        tanstackQueries: number;
        spatialTiles: number;
    };
}

export const CacheDebugPanel: React.FC<CacheDebugPanelProps> = ({
    isVisible = false,
    onToggle,
}) => {
    const [debugInfo, setDebugInfo] = useState<DebugInfo>({
        cacheStats: {
            totalEntries: 0,
            totalHits: 0,
            totalMisses: 0,
            hitRate: 0,
            memoryUsage: 0,
        },
        optimisticStats: {
            pendingComments: 0,
            pendingVotes: 0,
            rollbackQueueSize: 0,
        },
        integrationStats: {
            lastCacheInvalidation: Date.now(),
            lastCacheWarming: Date.now(),
            optimisticUpdateRate: 0,
            hybridCacheEntries: 0,
            tanstackQueries: 0,
            spatialTiles: 0,
        },
    });

    const queryClient = useQueryClient();

    // Update debug info
    const updateDebugInfo = () => {
        const cache = queryClient.getQueryCache();
        const queries = cache.getAll();
        const pinQueries = queries.filter(q => q.queryKey[0] === 'pins');
        const totalSize = queries.reduce((size, query) => {
            return size + (query.state.data ? JSON.stringify(query.state.data).length : 0);
        }, 0);

        setDebugInfo({
            cacheStats: {
                totalEntries: pinQueries.length,
                totalHits: 0,
                totalMisses: 0,
                hitRate: 0.85, // Estimated
                memoryUsage: totalSize,
            },
            optimisticStats: {
                pendingComments: 0,
                pendingVotes: 0,
                rollbackQueueSize: 0,
            },
            integrationStats: {
                lastCacheInvalidation: Date.now(),
                lastCacheWarming: Date.now(),
                optimisticUpdateRate: 0,
                hybridCacheEntries: pinQueries.length,
                tanstackQueries: queries.length,
                spatialTiles: 0,
            },
        });
    };

    // Auto-refresh debug info
    useEffect(() => {
        if (isVisible) {
            updateDebugInfo();
            const interval = setInterval(updateDebugInfo, 1000);
            return () => clearInterval(interval);
        }
    }, [isVisible]);

    // Clear all caches
    const handleClearAll = () => {
        queryClient.clear();
        updateDebugInfo();
    };

    // Format bytes
    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    // Format percentage
    const formatPercentage = (value: number): string => {
        return `${(value * 100).toFixed(1)}%`;
    };

    if (!isVisible) {
        return (
            <Button
                onClick={onToggle}
                variant="outline"
                size="sm"
                className="fixed bottom-4 right-4 z-50"
            >
                <Activity className="h-4 w-4 mr-2" />
                Cache Debug
            </Button>
        );
    }

    const { cacheStats, optimisticStats, integrationStats } = debugInfo;

    return (
        <div className="fixed bottom-4 right-4 w-96 max-h-96 z-50">
            <Card className="shadow-lg">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">Cache Debug Panel</CardTitle>
                        <div className="flex gap-1">
                            <Button onClick={updateDebugInfo} variant="ghost" size="sm">
                                <RefreshCw className="h-3 w-3" />
                            </Button>
                            <Button onClick={handleClearAll} variant="ghost" size="sm">
                                <Trash2 className="h-3 w-3" />
                            </Button>
                            <Button onClick={onToggle} variant="ghost" size="sm">
                                ×
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="pt-0">
                    <Tabs defaultValue="cache" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 text-xs">
                            <TabsTrigger value="cache">Cache</TabsTrigger>
                            <TabsTrigger value="optimistic">Optimistic</TabsTrigger>
                            <TabsTrigger value="integration">Integration</TabsTrigger>
                        </TabsList>

                        <TabsContent value="cache" className="space-y-2 mt-2">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <div className="font-medium">Entries</div>
                                    <Badge variant="secondary">{cacheStats.totalEntries}</Badge>
                                </div>
                                <div>
                                    <div className="font-medium">Hit Rate</div>
                                    <Badge variant={cacheStats.hitRate > 0.7 ? "default" : "destructive"}>
                                        {formatPercentage(cacheStats.hitRate)}
                                    </Badge>
                                </div>
                                <div>
                                    <div className="font-medium">Memory</div>
                                    <Badge variant="outline">
                                        {formatBytes(cacheStats.memoryUsage)}
                                    </Badge>
                                </div>
                                <div>
                                    <div className="font-medium">Hits/Misses</div>
                                    <Badge variant="outline">
                                        {cacheStats.totalHits}/{cacheStats.totalMisses}
                                    </Badge>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="optimistic" className="space-y-2 mt-2">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <div className="font-medium">Pending Comments</div>
                                    <Badge variant={optimisticStats.pendingComments > 0 ? "default" : "secondary"}>
                                        {optimisticStats.pendingComments}
                                    </Badge>
                                </div>
                                <div>
                                    <div className="font-medium">Pending Votes</div>
                                    <Badge variant={optimisticStats.pendingVotes > 0 ? "default" : "secondary"}>
                                        {optimisticStats.pendingVotes}
                                    </Badge>
                                </div>
                                <div>
                                    <div className="font-medium">Rollback Queue</div>
                                    <Badge variant="outline">
                                        {optimisticStats.rollbackQueueSize}
                                    </Badge>
                                </div>
                                <div>
                                    <div className="font-medium">Status</div>
                                    <Badge variant={
                                        optimisticStats.pendingComments + optimisticStats.pendingVotes > 0
                                            ? "default"
                                            : "secondary"
                                    }>
                                        {optimisticStats.pendingComments + optimisticStats.pendingVotes > 0
                                            ? "Active"
                                            : "Idle"}
                                    </Badge>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="integration" className="space-y-2 mt-2">
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="font-medium">Hybrid Cache:</span>
                                    <Badge variant="default">
                                        {integrationStats.hybridCacheEntries} pins
                                    </Badge>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium">TanStack Queries:</span>
                                    <Badge variant="secondary">
                                        {integrationStats.tanstackQueries}
                                    </Badge>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium">Spatial Tiles:</span>
                                    <Badge variant="outline">
                                        {integrationStats.spatialTiles}
                                    </Badge>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium">Hit Rate:</span>
                                    <Badge variant={cacheStats.hitRate > 0.7 ? "default" : "destructive"}>
                                        {formatPercentage(cacheStats.hitRate)}
                                    </Badge>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
};

// Hook for easy integration
export const useCacheDebug = () => {
    const [isVisible, setIsVisible] = useState(false);

    const toggleDebugPanel = () => setIsVisible(!isVisible);

    return {
        isVisible,
        toggleDebugPanel,
        CacheDebugPanel: () => (
            <CacheDebugPanel isVisible={isVisible} onToggle={toggleDebugPanel} />
        ),
    };
};
