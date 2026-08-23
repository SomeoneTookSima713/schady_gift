import { Translations } from "./translations.js";
import { Bond, BondType, ChemElem, Molecule, MoleculePositioning, MoleculeRenderer, PartialCharge, getMoleculeSize } from "./molecule.js";
/** @import {BondAngle} from "./molecule.js" */
import { getCurrentMolecule, InspectorWindow, setCurrentMolecule, closeInspector, mainMoleculeRenderer, InspectorHTML, undoMainMolecule, redoMainMolecule, addToMainMoleculeHistory, resetMainMoleculeHistory } from "./inspector.js";
import { pushNotification } from "./notifications.js";
import { isLibrarySelectorOpen, LIBRARY_SELECTOR_HTML, MoleculeLibrary, MoleculeLibrarySelector } from "./libraries.js";
import { createSimpleElement, makeNumInputScrollable } from "./html_helper.js";

const invoke = window.__TAURI__.core.invoke;
const listen = window.__TAURI__.event.listen;

globalThis.waitForElm = function(selector) {
    return new Promise(resolve => {
        if (document.querySelector(selector)) {
            return resolve(document.querySelector(selector));
        }

        const observer = new MutationObserver(mutations => {
            if (document.querySelector(selector)) {
                observer.disconnect();
                resolve(document.querySelector(selector));
            }
        });

        // If you get "parameter 1 is not of type 'Node'" error, see https://stackoverflow.com/a/77855838/492336
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}

let inspectorBaseHtml = new InspectorHTML(document.getElementById("inspector"));

/**
 * @param {ChemElem} element
 */
globalThis.inspectChemElem = function(element) {
    let inspector = document.getElementById("inspector");
    
    let window = new InspectorWindow(element, inspectorBaseHtml, inspectChemElem);

    window.openAndRender(inspector);
}

setCurrentMolecule(new Molecule("C"));

function saveMolecule() {
    let molecule = getCurrentMolecule();

    let json = JSON.stringify(molecule.serialize());

    invoke('save_molecule', { json })
        .then(path => {
            pushNotification(
                Translations.NOTIFICATIONS.TITLE_SAVE,
                Translations.NOTIFICATIONS.MSG_SAVE_COMPLETED.replace("$1", path),
                false, true
            );
        })
        .catch((/** @type {string} */ error) => {
            if (error === "err_save_aborted") {
                console.log("Save was aborted");
            } else if (typeof error === "string" && error.startsWith("err_write_errored_")) {
                pushNotification(
                    Translations.NOTIFICATIONS.TITLE_SAVE,
                    Translations.NOTIFICATIONS.MSG_SAVE_ERRORED.replace("$1", error.replace("err_write_errored_", "")),
                    true, false
                );
                console.error("Error writing file:", error.replace("err_write_errored_", ""));
            } else {
                throw error
            }
        });
}

function loadMoleculeFromFile() {
    invoke('load_molecule')
        .then((/** @type {string} */ json) => {
            let molecule = Molecule.deserialize(JSON.parse(json));
            if (!molecule) {
                pushNotification(
                    Translations.NOTIFICATIONS.TITLE_LOAD,
                    Translations.NOTIFICATIONS.MSG_LOAD_ERRORED.replace("$1", "serializationError"),
                    true, false
                );
                console.error("Error deserializing molecule!");
            } else {
                pushNotification(
                    Translations.NOTIFICATIONS.TITLE_LOAD,
                    Translations.NOTIFICATIONS.MSG_LOAD_COMPLETED,
                    false, true
                );
                setCurrentMolecule(molecule);
            }
        })
        .catch((/** @type {string} */ error) => {
            if (error === "err_load_aborted") {
                console.log("Load was aborted");
            } else if (typeof error === "string" && error.startsWith("err_read_errored_")) {
                pushNotification(
                    Translations.NOTIFICATIONS.TITLE_LOAD,
                    Translations.NOTIFICATIONS.MSG_LOAD_ERRORED.replace("$1", error.replace("err_read_errored_", "")),
                    true, false
                );
            } else {
                throw error;
            }
        })
}

function loadMoleculeFromLibrary() {
    MoleculeLibrary.load("molecules").then(lib => {
        let selector = new MoleculeLibrarySelector(lib, LIBRARY_SELECTOR_HTML, { moleculePositioningValue: MoleculePositioning.CENTER_HORIZ_MOLECULE });
        selector.open(mol => {
            pushNotification(
                Translations.NOTIFICATIONS.TITLE_LOAD,
                Translations.NOTIFICATIONS.MSG_LOAD_COMPLETED,
                false, true
            );
            resetMainMoleculeHistory();
            setCurrentMolecule(mol);
        });
    });
}

/**
 * @returns {Promise<HTMLCanvasElement>} The canvas containing the rendered molecule
 */
function renderMolecule() {
    return new Promise(async (resolve, reject) => {
        let scale = Number.parseFloat(document.querySelector(".options-export-quality-container input").value);

        let moleculeMetrics = getMoleculeSize(document.getElementById("main_container").children[0]);

        /** @type {HTMLElement} */
        let moleculeElem = document.querySelector("#main_container .molecule");

        // Compile external stylesheets into a baked CSS string
        let resultingStyle = "";
        let stylesheets = [
            "/assets/css/main.css",
            "/assets/css/molecule.css",
            "/assets/css/molecule_numeric_classes.css"
        ];
        for (let sheet of stylesheets) {
            let response = await fetch(sheet);
            resultingStyle += `${(await response.text()).replace(/\/\*.*?\*\//, "")}\n`;
        }

        // Bake any external resources referenced in the CSS into the string
        let urlRegex = /url\(\s*(['"])(.*?)\1\s*\)/g;
        let blobUrlsToRevoke = [];

        for (let match of resultingStyle.matchAll(urlRegex)) {
            let url = match[2];
            if (!url || url.startsWith("data:") || url.startsWith("#")) { continue; }
            let response = await fetch(url);
            if (!response.ok) {
                console.warn("Error during export: Couldn't load CSS asset at url "+url);
                continue;
            }
            let blob = await response.blob();
            
            let reader = new FileReader();
            let repl = `url(${await new Promise(resolve => {
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            })})`;
            // console.log(url, "=>", repl);
            resultingStyle = resultingStyle.replaceAll(match[0], repl);
        }

        let svgSrc = `
        <svg id="export-img-svg" xmlns="http://www.w3.org/2000/svg" width="${(moleculeMetrics.width + 40)*scale}" height="${(moleculeMetrics.height + 40)*scale}" style="display: block; overflow: hidden;">
            <style>
                <![CDATA[
                ${resultingStyle}
                div#molcont {
                    width: 100%;
                    height: 100%;
                    transform-origin: 50% 0%;
                    scale: ${scale};
                }
                ]]>
            </style>
            <foreignObject x="0" y="0" width="100%" height="100%">
                <div id="molcont" style="${moleculeElem.parentElement.getAttribute("style")}" xmlns="http://www.w3.org/1999/xhtml">
                    ${moleculeElem.parentElement.innerHTML}
                </div>
            </foreignObject>
        </svg>
        `;
        let canvas = document.createElement("canvas");
        canvas.width = (moleculeMetrics.width + 40)*scale;
        canvas.height = (moleculeMetrics.height + 40)*scale;

        let ctx = canvas.getContext("2d");
        let svgBlob = new Blob([svgSrc], { type: "image/svg+xml;charset=utf-8" });

        let tempImg = new Image();
        tempImg.addEventListener("load", () => {
            ctx.drawImage(tempImg, 0, 0);
            for (let url of blobUrlsToRevoke) {
                URL.revokeObjectURL(url);
            }
            resolve(canvas);
        });
        tempImg.addEventListener("error", e => {
            console.error("Error loading SVG image for export: ", e.error, e.message);
            reject(e);
        });
        tempImg.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgSrc)}`;
    });
}

async function exportMoleculeAsPNG() {
    let button = document.getElementsByClassName("options-export-dropdown")[0];
    button.disabled = true;
    bootstrap.Dropdown.getOrCreateInstance(document.getElementsByClassName("options-export-dropdown")[0].parentElement.querySelector(".dropdown-menu")).hide();
    closeInspector();
    
    let canvas = await renderMolecule();
    canvas.toBlob(async blob => {
        let buf = await blob.bytes();
        console.log(buf.length);
        invoke("export_molecule_png", buf, { headers: { width: canvas.width.toString(), height: canvas.height.toString() } })
            .then((/** @type {string} */ result) => {
                pushNotification(
                    Translations.NOTIFICATIONS.TITLE_EXPORT,
                    Translations.NOTIFICATIONS.MSG_EXPORT_COMPLETED,
                    false, true
                );
                console.log(result);
            })
            .catch((/** @type {string} */ error) => {
                if (error === "err_export_aborted") {
                    console.log("Load was aborted");
                } else {
                    pushNotification(
                        Translations.NOTIFICATIONS.TITLE_EXPORT,
                        Translations.NOTIFICATIONS.MSG_EXPORT_ERRORED.replace("$1", error),
                        true, false
                    );
                }
            })
            .finally(() => {
                button.disabled = false;
            })
    });
}

async function exportMoleculeToClipboard() {
    let button = document.getElementsByClassName("options-export-dropdown")[0];
    button.disabled = true;
    bootstrap.Dropdown.getOrCreateInstance(document.getElementsByClassName("options-export-dropdown")[0].parentElement.querySelector(".dropdown-menu")).hide();
    closeInspector();
    
    let canvas = await renderMolecule();
    let ctx = canvas.getContext("2d")
    invoke("export_molecule_clipboard", ctx.getImageData(0, 0, canvas.width, canvas.height).data, { headers: { width: canvas.width.toString(), height: canvas.height.toString() } })
        .then((/** @type {string} */ result) => {
            pushNotification(
                Translations.NOTIFICATIONS.TITLE_EXPORT,
                Translations.NOTIFICATIONS.MSG_EXPORT_COMPLETED,
                false, true
            );
            console.log(result);
        })
        .catch((/** @type {string} */ error) => {
            if (error === "err_export_aborted") {
                console.log("Load was aborted");
            } else {
                pushNotification(
                    Translations.NOTIFICATIONS.TITLE_EXPORT,
                    Translations.NOTIFICATIONS.MSG_EXPORT_ERRORED.replace("$1", error),
                    true, false
                );
            }
        })
        .finally(() => {
            button.disabled = false;
        });

    // canvas.toBlob(async blob => {
    //     let buf = await blob.bytes();
    //     console.log(buf.length);
    //     invoke("export_molecule", buf, { headers: { width: canvas.width.toString(), height: canvas.height.toString() } })
    //         .then((/** @type {string} */ result) => {
    //             pushNotification(
    //                 Translations.NOTIFICATIONS.TITLE_EXPORT,
    //                 Translations.NOTIFICATIONS.MSG_EXPORT_COMPLETED,
    //                 false, true
    //             );
    //             console.log(result);
    //         })
    //         .catch((/** @type {string} */ error) => {
    //             if (error === "err_export_aborted") {
    //                 console.log("Load was aborted");
    //             } else {
    //                 pushNotification(
    //                     Translations.NOTIFICATIONS.TITLE_EXPORT,
    //                     Translations.NOTIFICATIONS.MSG_EXPORT_ERRORED.replace("$1", error),
    //                     true, false
    //                 );
    //             }
    //         })
    //         .finally(() => {
    //             button.disabled = false;
    //         })
    // });
}

window.onload = () => {
    document.getElementById("options-save-molecule").onclick = saveMolecule;
    document.getElementById("options-load-molecule-from-file").onclick = loadMoleculeFromFile;
    document.getElementById("options-load-molecule-from-library").onclick = loadMoleculeFromLibrary;
    // document.getElementById("options-export-molecule").onclick = exportMolecule;
    makeNumInputScrollable(document.querySelector(".options-export-quality-container input"), 1, 1, 0.5);
    document.getElementById("options-export-molecule-to-png").onclick = exportMoleculeAsPNG;
    document.getElementById("options-export-molecule-to-clipboard").onclick = exportMoleculeToClipboard;
    document.getElementById("options-reset-molecule").onclick = () => setCurrentMolecule(new Molecule("C"));
};

setTimeout(() => {
    listen("update-download-started", event => {
        /** @type {{from: String, to: String}} */
        let versionInfo = JSON.parse(event.payload);

        console.log("UPDATEEVENT");

        let msg = Translations.NOTIFICATIONS.MSG_UPDATE_STARTED
            .replace("$1", versionInfo.from)
            .replace("$2", versionInfo.to);

        pushNotification(Translations.NOTIFICATIONS.TITLE_UPDATE, msg, false, false);
    });
}, 500);

var draggingMainWorkspace = false;
/** @type {{x: number, y: number}} */
var origMousePos = {x: 0, y: 0};
/** @type {{x: number, y: number}} */
var origElemOffset = {x: 0, y: 0};
document.getElementById("main_container").onmousedown = event => {
    if (event.button == 2) {
        draggingMainWorkspace = true;
        origMousePos = {x: event.screenX, y: event.screenY};
        origElemOffset = {x: mainMoleculeRenderer.molecule_offset_x, y: mainMoleculeRenderer.molecule_offset_y};
    }
};

document.onmousemove = event => {
    if (draggingMainWorkspace) {
        mainMoleculeRenderer.molecule_offset_x = origElemOffset.x + event.screenX - origMousePos.x;
        mainMoleculeRenderer.molecule_offset_y = origElemOffset.y + event.screenY - origMousePos.y;
    }
};

document.onmouseup = event => {
    if (event.button == 2) {
        draggingMainWorkspace = false;
    }
};

window.oncontextmenu = () => false;

document.addEventListener("keydown", event => {
    if (isLibrarySelectorOpen()) { return; }
    if (event.key.toLocaleLowerCase() === "z" && event.ctrlKey) {
        undoMainMolecule();
    } else if (event.key.toLocaleLowerCase() === "y" && event.ctrlKey) {
        redoMainMolecule();
    }
});