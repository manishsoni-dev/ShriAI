export { auth as proxy } from "@/auth";

export const config = {
  matcher: ["/dashboard/:path*", "/chat/:path*", "/knowledge/:path*"],
};
