import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthenticationError } from "@/lib/errors";
import { dashboardAggregator } from "@/lib/services/dashboard-aggregator";

export const GET = withErrorHandling(async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new AuthenticationError();
  }

  const userId = session.user.id;
  const stats = await dashboardAggregator.getStats(userId);

  return NextResponse.json(stats);
});
