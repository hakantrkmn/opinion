import { adminService } from "@/lib/services/adminService";
import { checkAdminAuth } from "@/lib/admin-auth";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const isAdmin = await checkAdminAuth();
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 401 }
      );
    }

    console.log("🔄 Admin requesting refresh of all user statistics...");
    const startTime = performance.now();

    // Refresh all user statistics
    const { success, error } = await adminService.refreshAllUserStats();

    if (!success) {
      console.error("❌ Failed to refresh user statistics:", error);
      return NextResponse.json(
        {
          error: error || "Failed to refresh user statistics",
          success: false,
        },
        { status: 500 }
      );
    }

    const endTime = performance.now();
    const duration = (endTime - startTime).toFixed(2);

    console.log(
      `✅ All user statistics refreshed successfully in ${duration}ms`
    );

    // Get updated statistics summary
    const summary = await adminService.getUserStatsSummary();

    return NextResponse.json({
      success: true,
      message: "All user statistics refreshed successfully",
      performanceInfo: {
        duration: parseFloat(duration),
        method: "bulk_refresh",
        timestamp: new Date().toISOString(),
      },
      summary: summary || null,
    });
  } catch (error) {
    console.error("❌ Error in refresh-stats API:", error);
    return NextResponse.json(
      {
        error: "Internal server error while refreshing statistics",
        success: false,
      },
      { status: 500 }
    );
  }
}
