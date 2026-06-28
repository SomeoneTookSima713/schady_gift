import { Translations } from "./translations.js";
import { Bond, BondType, ChemElem, Molecule, PartialCharge, mainRender, getMoleculeSize } from "./molecule.js";
/** @import {BondAngle} from "./molecule.js" */
import { getCurrentMolecule, InspectorWindow, setCurrentMolecule, closeInspector } from "./inspector.js";
import { pushNotification } from "./notifications.js";

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

/**
 * @param {ChemElem} element
 */
globalThis.inspectChemElem = function(element) {
    let inspector = document.getElementById("inspector");
    
    let window = new InspectorWindow(element, inspectChemElem);

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
            } else if (error.startsWith("err_write_errored_")) {
                pushNotification(
                    Translations.NOTIFICATIONS.TITLE_SAVE,
                    Translations.NOTIFICATIONS.MSG_SAVE_ERRORED.replace("$1", error.replace("err_write_errored_", "")),
                    true, false
                );
                console.error("Error writing file:", error.replace("err_write_errored_", ""));
            }
        });
}

function loadMolecule() {
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
            } else if (error.startsWith("err_read_errored_")) {
                pushNotification(
                    Translations.NOTIFICATIONS.TITLE_LOAD,
                    Translations.NOTIFICATIONS.MSG_LOAD_ERRORED.replace("$1", error.replace("err_read_errored_", "")),
                    true, false
                );
            }
        })
}

function exportMolecule() {
    let button = document.getElementById("options-export-molecule");
    button.disabled = true;
    let moleculeMetrics = getMoleculeSize(document.getElementById("main_container").children[0]);

    closeInspector();

    console.log(moleculeMetrics);

    let scale = Math.min(Math.max(window.innerWidth / (moleculeMetrics.width + 20), 1), 2);
    let moleculeElem = document.querySelector("#main_container .molecule").childNodes[0].parentElement;
    moleculeElem.style.transform = `scale(${scale})`;
    let params = {
        moleculeX: moleculeMetrics.minX - moleculeMetrics.width * 0.5 * (scale - 1) - 10,
        moleculeY: moleculeMetrics.minY - moleculeMetrics.height * 0.5 * (scale - 1) - 10,
        moleculeWidth: moleculeMetrics.width * scale + 20,
        moleculeHeight: moleculeMetrics.height * scale + 20
    };

    setTimeout(() => {
        invoke('export_molecule', params)
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
                moleculeElem.style.transform = "";
            });
    }, 500);
}

window.onload = () => {
    document.getElementById("options-save-molecule").onclick = saveMolecule;
    document.getElementById("options-load-molecule").onclick = loadMolecule;
    document.getElementById("options-export-molecule").onclick = exportMolecule;
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