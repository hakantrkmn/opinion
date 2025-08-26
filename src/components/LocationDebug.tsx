"use client";

import { Button } from "@/components/ui/button";
import {
    checkGeolocationSupport,
    getGeolocationPermission,
    getMobileInstructions,
    isHTTPS
} from "@/utils/geolocation";
import { useEffect, useState } from "react";

interface LocationDebugProps {
    isVisible: boolean;
    onClose: () => void;
}

export default function LocationDebug({ isVisible, onClose }: LocationDebugProps) {
    const [debugInfo, setDebugInfo] = useState<{
        hasGeolocation: boolean;
        isSecure: boolean;
        permissionState: PermissionState | null;
        userAgent: string;
        isMobile: boolean;
        instructions: string[];
    } | null>(null);

    useEffect(() => {
        if (isVisible) {
            const checkDebugInfo = async () => {
                const hasGeolocation = checkGeolocationSupport();
                const isSecure = isHTTPS();
                const permissionState = await getGeolocationPermission();
                const userAgent = navigator.userAgent;
                const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
                const instructions = getMobileInstructions();

                setDebugInfo({
                    hasGeolocation,
                    isSecure,
                    permissionState,
                    userAgent,
                    isMobile,
                    instructions,
                });
            };

            checkDebugInfo();
        }
    }, [isVisible]);

    if (!isVisible || !debugInfo) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Location Debug Info</h3>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        ✕
                    </Button>
                </div>

                <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                        <span>Geolocation Support:</span>
                        <span className={debugInfo.hasGeolocation ? "text-green-600" : "text-red-600"}>
                            {debugInfo.hasGeolocation ? "✓ Available" : "✗ Not Available"}
                        </span>
                    </div>

                    <div className="flex justify-between">
                        <span>HTTPS:</span>
                        <span className={debugInfo.isSecure ? "text-green-600" : "text-red-600"}>
                            {debugInfo.isSecure ? "✓ Secure" : "✗ Not Secure"}
                        </span>
                    </div>

                    <div className="flex justify-between">
                        <span>Permission Status:</span>
                        <span className={
                            debugInfo.permissionState === 'granted' ? "text-green-600" :
                                debugInfo.permissionState === 'denied' ? "text-red-600" :
                                    debugInfo.permissionState === 'prompt' ? "text-blue-600" : "text-yellow-600"
                        }>
                            {debugInfo.permissionState === 'prompt' ? 'Prompt (iOS)' : (debugInfo.permissionState || "Unknown")}
                        </span>
                    </div>

                    <div className="flex justify-between">
                        <span>Mobile Device:</span>
                        <span className={debugInfo.isMobile ? "text-blue-600" : "text-gray-600"}>
                            {debugInfo.isMobile ? "✓ Yes" : "✗ No"}
                        </span>
                    </div>

                    <div className="border-t pt-3">
                        <p className="font-medium mb-2">Browser Info:</p>
                        <p className="text-xs text-gray-600 break-all">
                            {debugInfo.userAgent}
                        </p>
                    </div>

                    {debugInfo.isMobile && (
                        <div className="border-t pt-3">
                            <p className="font-medium mb-2">Mobile Instructions:</p>
                            <ul className="text-xs space-y-1">
                                {debugInfo.instructions.map((instruction, index) => (
                                    <li key={index} className="text-gray-600">
                                        • {instruction}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="border-t pt-3">
                        <p className="font-medium mb-2">Common Solutions:</p>
                        <ul className="text-xs space-y-1 text-gray-600">
                            <li>• Refresh the page (F5 or pull-to-refresh)</li>
                            <li>• Close and reopen your browser</li>
                            <li>• Restart your device</li>
                            <li>• Try a different browser</li>
                            <li>• Don&apos;t use private/incognito mode</li>
                        </ul>
                    </div>
                </div>

                <Button onClick={onClose} className="w-full mt-4">
                    Close
                </Button>
            </div>
        </div>
    );
}
