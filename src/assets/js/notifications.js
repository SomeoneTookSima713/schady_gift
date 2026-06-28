import * as HTMLHelper from "./html_helper.js";

/**
 * 
 * @param {string} title 
 * @param {HTMLElement ? string} content 
 * @param {boolean} isError 
 * @param {boolean} autoDismiss 
 */
export function pushNotification(title, content, isError, autoDismiss) {
    let notificationContainer = document.getElementById("notifications");

    let notification = HTMLHelper.createSimpleElement("div", "", { classes: ["notification"] });

    let closeFn = () => {
        notification.classList.remove("visible");
        setTimeout(() => notification.remove(), 1000);
    };

    let header = HTMLHelper.createSimpleElement("div", "", { classes: ["notification-header"] });
    header.appendChild(HTMLHelper.createSimpleElement("h3", title));
    header.appendChild(HTMLHelper.createButton("Schließen", {
        classes: ["notification-close"],
        onclick: closeFn
    }));

    let body = HTMLHelper.createSimpleElement("div", "", { classes: ["notification-body"] });
    body.appendChild((content instanceof HTMLElement) ? content : HTMLHelper.createSimpleElement("span", content));

    notification.appendChild(header);
    notification.appendChild(body);

    notificationContainer.appendChild(notification);
    setTimeout(() => notification.classList.add("visible"), 100);
    if (isError) {
        notification.classList.add("error");
    }
    if (autoDismiss) {
        notification.classList.add("auto-dismiss");
        setTimeout(closeFn, 8000);
    }
}

globalThis.shadyChemicalsDebug_pushNotification = pushNotification;