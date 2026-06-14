export { auth as proxy } from "@/auth";

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
    "/chat/:path*",
    "/knowledge/:path*",
  ],
};
