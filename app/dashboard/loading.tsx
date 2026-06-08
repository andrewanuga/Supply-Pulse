export default function DashboardLoading() {
  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "var(--bg)" }}
    >
      {/* Sidebar skeleton */}
      <div
        className="w-16 lg:w-56 flex-shrink-0 border-r"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        <div className="p-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg animate-pulse"
              style={{ background: "var(--bg-2)" }}
            />
            <div
              className="hidden lg:block h-4 w-24 rounded animate-pulse"
              style={{ background: "var(--bg-2)" }}
            />
          </div>
        </div>
        <div className="p-2 space-y-1">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-10 rounded-xl animate-pulse"
              style={{ background: "var(--bg-2)", animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <div
          className="h-14 border-b px-6 flex items-center gap-4"
          style={{ borderColor: "var(--border)" }}
        >
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: "var(--accent)" }}
          />
          <div
            className="h-4 w-32 rounded animate-pulse"
            style={{ background: "var(--bg-2)" }}
          />
          <div className="ml-auto flex gap-2">
            {[80, 64, 48].map((w, i) => (
              <div
                key={i}
                className="h-8 rounded-xl animate-pulse"
                style={{ background: "var(--bg-2)", width: `${w}px` }}
              />
            ))}
          </div>
        </div>

        {/* KPI row */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-24 rounded-2xl animate-pulse"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)", animationDelay: `${i * 80}ms` }}
              />
            ))}
          </div>

          {/* Grid */}
          <div className="grid xl:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-72 rounded-2xl animate-pulse"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)", animationDelay: `${i * 120}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
