import * as HTMLHelper from "./html_helper.js";

/**
 * 
 * @param {string} title 
 * @param {HTMLElement | string} content 
 * @param {boolean} isError 
 * @param {boolean} autoDismiss 
 */
export function pushNotification(title, content, isError, autoDismiss) {
    let notificationContainer = document.getElementById("notifications");

    // let notification = HTMLHelper.createSimpleElement("div", "", { classes: ["notification"] });
    let notification = HTMLHelper.createSimpleElement("div", "", { classes: ["toast"] });
    notification.role = "alert";
    notification.ariaLive = "assertive";
    notification.ariaAtomic = "true";

    let header = HTMLHelper.createSimpleElement("div", "", { classes: ["toast-header"] });
    header.appendChild(HTMLHelper.createSimpleElement("div", "", {
        classes: ["rounded", "me-2"],
        styles: {
            width: "20px",
            height: "20px",
            display: "inline-block",
            background: isError ? "#da3c20" : "#54da20"
        }
    }));
    header.appendChild(HTMLHelper.createSimpleElement("strong", title, { classes: ["me-auto"] }));
    header.appendChild(HTMLHelper.createSimpleElement("button", "", { classes: ["btn-close"], attrs: { "data-bs-dismiss": "toast", "aria-label": "Close" } }));

    let body = HTMLHelper.createSimpleElement("div", (content instanceof HTMLElement) ? [content] : content, { classes: ["toast-body"] });

    notification.appendChild(header);
    notification.appendChild(body);

    notificationContainer.appendChild(notification);
    // setTimeout(() => notification.classList.add("visible"), 100);
    // if (isError) {
    //     notification.classList.add("error");
    // }
    // if (autoDismiss) {
    //     notification.classList.add("auto-dismiss");
    //     setTimeout(closeFn, 8000);
    // }
    let bootstrapToast = bootstrap.Toast.getOrCreateInstance(notification);
    bootstrapToast.autohide = autoDismiss;
    bootstrapToast.show();
    notification.addEventListener("hidden.bs.toast", () => { notificationContainer.removeChild(notification); });
}

globalThis.shadyChemicalsDebug_pushNotification = pushNotification;