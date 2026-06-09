// ─── Auth temporarily disabled ───────────────────────────────────────────────
// The dashboard is open (no login required) for now.
// To re-enable auth later, restore the block below and remove the no-op middleware.
//
// import { withAuth } from "next-auth/middleware";
//
// export default withAuth({
//   pages: {
//     signIn: "/login",
//   },
// });
//
// export const config = {
//   matcher: ["/dashboard/:path*"],
// };

export function middleware() {
  // no-op — all routes are public while auth is disabled
}

export const config = {
  matcher: [],
};
