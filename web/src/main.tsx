import React from "react";
import { createRoot } from "react-dom/client";
import "antd/dist/reset.css";
import "streamdown/styles.css";
import "./styles/globals.css";

import { bootstrapSub2ApiSession } from "@/lib/sub2api-session";
import { useUserStore } from "@/stores/use-user-store";

const root = createRoot(document.getElementById("root")!);
document.body.style.fontFamily = '"SF Pro Display","SF Pro Text","PingFang SC","Microsoft YaHei","Helvetica Neue",sans-serif';

root.render(<div className="flex h-dvh items-center justify-center bg-background text-sm text-muted-foreground">正在验证登录状态…</div>);

void bootstrapSub2ApiSession().then(async (bootstrap) => {
    if (!bootstrap) return;
    useUserStore.getState().setSession(bootstrap.session, bootstrap.user);
    const [{ AppProviders }, { RouterProvider }, { router }, { initAnalytics }] = await Promise.all([
        import("@/components/layout/app-providers"),
        import("react-router-dom"),
        import("@/router"),
        import("@/lib/analytics"),
        import("@/i18n"),
    ]);
    initAnalytics();
    root.render(
        <React.StrictMode>
            <AppProviders>
                <RouterProvider router={router} />
            </AppProviders>
        </React.StrictMode>,
    );
});
