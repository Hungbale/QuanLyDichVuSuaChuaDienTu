import { useEffect, useState } from "react";

type Toast = {
    id: number;
    type: "success" | "error";
    message: string;
    retryButton?: HTMLButtonElement;
};

const messageFrom = (element: HTMLElement) => {
    const copy = element.cloneNode(true) as HTMLElement;
    copy.querySelectorAll("button").forEach((button) => button.remove());
    return (copy.innerText || copy.textContent || "").replace(/\s+/g, " ").trim();
};

function GlobalNotifications() {
    const [toasts, setToasts] = useState<Toast[]>([]);

    useEffect(() => {
        let nextId = 0;
        const reportedText = new WeakMap<HTMLElement, string>();
        const capture = (root: ParentNode) => {
            const candidates: HTMLElement[] = [];
            const selector = ".success-message, .error-message, .auth-success, .auth-error";
            if (root instanceof HTMLElement && root.matches(selector)) candidates.push(root);
            root.querySelectorAll?.<HTMLElement>(selector).forEach((element) => candidates.push(element));

            candidates.forEach((element) => {
                const message = messageFrom(element);
                if (!message || reportedText.get(element) === message) return;
                reportedText.set(element, message);
                element.hidden = true;
                const type = element.classList.contains("success-message") || element.classList.contains("auth-success") ? "success" : "error";
                const retryButton = element.querySelector("button") ?? undefined;
                const id = ++nextId;
                setToasts((current) => [...current, { id, type, message, retryButton }]);
                window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 10_000);
            });
        };

        capture(document.body);
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === "childList") mutation.addedNodes.forEach((node) => {
                    if (node instanceof HTMLElement) capture(node);
                });
                if (mutation.type === "characterData") {
                    const parent = mutation.target.parentElement?.closest<HTMLElement>(".success-message, .error-message, .auth-success, .auth-error");
                    if (parent) capture(parent);
                }
            });
        });
        observer.observe(document.body, { childList: true, characterData: true, subtree: true });
        return () => observer.disconnect();
    }, []);

    return <div className="global-notifications" aria-label="Thông báo" aria-live="polite" aria-relevant="additions">
        {toasts.map((toast) => <div className={`global-notification global-notification-${toast.type}`} key={toast.id} role={toast.type === "error" ? "alert" : "status"}>
            <span className="global-notification-icon" aria-hidden="true">{toast.type === "error" ? "!" : "✓"}</span>
            <span className="global-notification-message">{toast.message}</span>
            {toast.retryButton && <button className="global-notification-action" type="button" onClick={() => toast.retryButton?.click()}>{toast.retryButton.innerText || "Thử lại"}</button>}
            <button className="global-notification-close" type="button" aria-label="Đóng thông báo" onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}>×</button>
        </div>)}
    </div>;
}

export default GlobalNotifications;
