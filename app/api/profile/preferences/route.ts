import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { AuthenticationError } from "@/lib/errors";

export const PUT = withErrorHandling(async (request: Request) => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new AuthenticationError();
  }

  const userId = session.user.id;
  const body = await request.json();

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      preferences: JSON.stringify(body),
    },
  });

  return NextResponse.json(JSON.parse(updatedUser.preferences));
});
