import { Bond, BondType, ChemElem, Molecule, PartialCharge, mainRender, updateMoleculeSize } from "./molecule.js";
/** @import {BondAngle} from "./molecule.js" */

import { Translations } from "./translations.js";
import { createButton, createNumberInput, createSelect, createSimpleElement, createTextInput, createCheckboxInput } from "./html_helper.js";
import { NEW_BOND_PRESETS } from "./bond_presets.js";

var PERSISTENT_ELEMS = {
    inited: false,
    /** @type {HTMLSelectElement?} */
    ADD_SELECT: null,
    /** @type {HTMLInputElement?} */
    ADD_ANGLE: null,
    /** @type {HTMLInputElement?} */
    INC_ANGLE_CHECKBOX: null,
    /** @type {HTMLInputElement?} */
    SWITCH_INSPECT_CHECKBOX: null,
    /** @type {HTMLInputElement?} */
    BOND_LENGTH: null,
};

function getOrInitPersistentElems() {
    if (!PERSISTENT_ELEMS.inited) {
        PERSISTENT_ELEMS.ADD_SELECT = createSelect(Object.keys(NEW_BOND_PRESETS).map(id => [id, Translations.NEW_BOND_PRESETS[id]]), "empty", {
            classes: ["inspector-add-bond-select-type"]
        });
        PERSISTENT_ELEMS.ADD_ANGLE = createNumberInput(0, {
            classes: ["inspector-add-bond-angle"],
            min: -15,
            max: 360,
            step: 15,
            oninput: elem => { elem.value = ((Number(elem.value) + 3600) % 360).toString(); }
        });
        PERSISTENT_ELEMS.INC_ANGLE_CHECKBOX = createCheckboxInput(false, {
            classes: ["inspector-add-bond-inc-angle"]
        });
        PERSISTENT_ELEMS.SWITCH_INSPECT_CHECKBOX = createCheckboxInput(false, {
            classes: ["inspector-add-bond-switch-inspect"]
        });
        PERSISTENT_ELEMS.BOND_LENGTH = createNumberInput(1, {
            classes: ["inspector-add-bond-length"],
            min: 0.25,
            max: 4,
            step: 0.25,
            oninput: elem => { elem.value = Math.max(Math.min(Number(elem.value), 4), 0.25).toString(); }
        });
        PERSISTENT_ELEMS.inited = true;
    }
    return PERSISTENT_ELEMS;
}

/**
 * @param {ChemElem} [currElem] 
 */
function unhighlightMolecule(currElem) {
    if (currElem) {
        let elem_html = document.getElementById(`elem-${currElem.id}`)
        if (elem_html) {
            elem_html.classList.remove("highlighted");
            elem_html.classList.remove("selected");
            currElem.attachedBonds.forEach(b => { if (b.attachedElem) { unhighlightMolecule(b.attachedElem) } });
        }
    } else if (currentMolecule) {
        unhighlightMolecule(currentMolecule.root);
    }
}

setInterval(() => {
    unhighlightMolecule();
    for (let elem of hightlightedElems.values()) {
        document.getElementById(`elem-${elem.id}`).classList.add("highlighted");
    }
    if (selectedElem) {
        document.getElementById(`elem-${selectedElem.id}`).classList.add("selected");
    }
}, 50);

/**
 * @typedef {Object} InspectorWindowGeneralStuff
 * @property {HTMLButtonElement} closeBtn
 * @property {HTMLHeadingElement} titleGeneral
 * @property {HTMLLabelElement} labelElementText
 * @property {HTMLInputElement} inputElementText
 * @property {HTMLButtonElement} sparseRemoveBtn
 * @property {HTMLButtonElement} fullRemoveBtn
 */

/**
 * @typedef {Object} InspectorWindowBondStuff
 * @property {HTMLButtonElement} removeBtn
 * @property {HTMLSelectElement} bondType
 * @property {HTMLInputElement} bondAngle
 * @property {HTMLInputElement} bondLength
 * @property {HTMLButtonElement} attachedElement
 */

/**
 * @typedef {Object} InspectorWindowAddBondStuff
 * @property {HTMLButtonElement} addBtn
 * @property {HTMLSelectElement} bondPreset
 * @property {HTMLInputElement} bondAngle
 * @property {HTMLInputElement} incAngleCheckbox
 * @property {HTMLInputElement} switchInspectCheckbox
 * @property {HTMLInputElement} bondLength
 */

export function closeInspector() {
    document.getElementById("inspector").classList.remove("active");
    selectedElem = null;
    hightlightedElems.clear();
}

export class InspectorWindow {
    /** @type {ChemElem} */
    element;
    /** @type {InspectorWindowGeneralStuff} */
    generalStuff;
    /** @type {{title: HTMLHeadingElement, bonds: InspectorWindowBondStuff[], newBond: InspectorWindowAddBondStuff}} */
    bondsStuff;

    /**
     * @param {ChemElem} element
     * @param {(element: ChemElem) => any} inspectElemFn
     * @returns {InspectorWindowGeneralStuff}
     */
    static #createGeneralInspectorStuff(element, inspectElemFn) {
        let br = document.createElement("br");
        let inspectorCloseBtn = createButton(Translations.TEXTS.INSPECTOR_CLOSE_BTN, {
            id: "inspector-close",
            onclick: closeInspector
        });
        let titleGeneral = createSimpleElement("h3", Translations.TEXTS.INSPECTOR_TITLE_GENERAL);
        let labelElem = createSimpleElement("label", Translations.TEXTS.INSPECTOR_LABEL_ELEM);
        let inputElem = createTextInput(element.name, {
            id: "inspector-name",
            autocomplete: false,
            oninput: elem => {
                element.name = elem.value;
                mainRender(currentMolecule);
            }
        });
        let sparseRemoveBtn = createButton(Translations.TEXTS.INSPECTOR_BTN_REMOVE_SPARSE, {
            id: "inspector-remove-elem",
            onclick: _ => {
                let parent = element.parentElem;
                element.parentBond.attachedElem = undefined;
                element.parentElem = null;
                inspectElemFn(parent);
                mainRender(currentMolecule);
                updateMoleculeSize();
            }
        });
        let fullRemoveBtn = createButton(Translations.TEXTS.INSPECTOR_BTN_REMOVE_FULL, {
            id: "inspector-remove-elem-full",
            onclick: _ => {
                let parent = element.parentElem;
                element.unattachSelf();
                inspectElemFn(parent);
                mainRender(currentMolecule);
                updateMoleculeSize();
            }
        });
        if (!element.parentElem) {
            sparseRemoveBtn.disabled = true;
            sparseRemoveBtn.title = Translations.TEXTS.INSPECTOR_ELEM_CANNOT_REMOVE;
            fullRemoveBtn.disabled = true;
            fullRemoveBtn.title = Translations.TEXTS.INSPECTOR_ELEM_CANNOT_REMOVE;
        }

        return {
            closeBtn: inspectorCloseBtn,
            titleGeneral,
            labelElementText: labelElem,
            inputElementText: inputElem,
            sparseRemoveBtn,
            fullRemoveBtn
        };
    }

    /**
     * 
     * @param {ChemElem} element The currently inspected element
     * @param {"parent"|Bond} currBond The bond to generate HTML for
     * @param {(element: ChemElem) => any} inspectElemFn
     * @returns {InspectorWindowBondStuff}
     */
    static #createBondInspectorStuff(element, currBond, inspectElemFn) {
        let isParent = currBond === "parent";
        if (isParent) { currBond = element.parentBond; }
        let removeBtn = isParent
            ? createButton("X", {
                classes: ["inspector-bond-elem-remove"],
                disabled: true,
                title: Translations.TEXTS.INSPECTOR_BOND_CANNOT_REMOVE
            })
            : createButton("X", {
                classes: ["inspector-bond-elem-remove"],
                onclick: elem => {
                    if (currBond.attachedElem) {
                        currBond.attachedElem.unattachSelf();
                    } else {
                        element.attachedBonds.splice(element.attachedBonds.indexOf(currBond), 1);
                    }
                    mainRender(currentMolecule);
                    inspectElemFn(element);
                }
            });
        let bondType = createSelect(Object.values(BondType).map(v => [v, Translations.BOND_TYPE[v]]), currBond.bondType, {
            classes: ["inspector-bond-select-type"],
            oninput: elem => {
                currBond.bondType = elem.value;
                mainRender(currentMolecule);
            }
        });
        let bondAngle = createNumberInput((currBond.angle + (isParent ? 180 : 0)) % 360, {
            classes: ["inspector-bond-angle"],
            min: -15,
            max: 360,
            step: 15,
            oninput: elem => {
                let numval = Number(elem.value);
                numval = (numval + 3600) % 360;
                elem.value = numval.toString();
                currBond.angle = (numval + (isParent ? 180 : 0)) % 360;
                mainRender(currentMolecule);
            }
        });
        let bondLength = createNumberInput(currBond.length, {
            classes: ["inspector-bond-length"],
            min: 0.25,
            max: 4,
            step: 0.25,
            oninput: elem => {
                let numval = Number(elem.value);
                numval = Math.max(Math.min(numval, 4), 0.25);
                elem.value = numval.toString();
                currBond.length = numval;
                mainRender(currentMolecule);
            }
        });
        let attachedElement = createButton(isParent ? element.parentElem.name : (currBond.attachedElem ? currBond.attachedElem.name : Translations.TEXTS.INSPECTOR_ADD_ELEMENT), {
            classes: ["inspector-bond-elem-name"],
            onclick: currBond.attachedElem
                ? (_ => inspectElemFn(isParent ? element.parentElem : currBond.attachedElem))
                : (_ => {
                    let newElem = new ChemElem("C");
                    currBond.attachedElem = newElem;
                    newElem.parentElem = element;
                    inspectElemFn(getOrInitPersistentElems().SWITCH_INSPECT_CHECKBOX.checked ? newElem : element);
                    mainRender(currentMolecule);
                }),
            onmouseenter: currBond.attachedElem ? _ => hightlightedElems.add(currBond.attachedElem) : undefined,
            onmouseleave: currBond.attachedElem ? _ => hightlightedElems.delete(currBond.attachedElem) : undefined,
        });

        return {
            removeBtn,
            bondType,
            bondAngle,
            bondLength,
            attachedElement
        };
    }

    /**
     * @param {ChemElem} element
     * @param {(element: ChemElem) => any} inspectElemFn
     * @returns {InspectorWindowAddBondStuff}
     */
    static #createAddBondInspectorStuff(element, inspectElemFn) {
        let title = createSimpleElement("h4", Translations.TEXTS.INSPECTOR_TITLE_ADD_BOND);
        let addBtn = createButton("+", {
            classes: ["inspector-bond-elem-remove"],
            onclick: elem => {
                let persistentElems = getOrInitPersistentElems();

                let addAngle = Number(persistentElems.ADD_ANGLE.value);
                let addLength = Number(persistentElems.BOND_LENGTH.value);
                let newBond = new Bond(BondType.SINGLE, addAngle, addLength, NEW_BOND_PRESETS[persistentElems.ADD_SELECT.value](addAngle, addLength));
                let incAngle;
                if (element.attachedBonds.length > 8) { incAngle = 30; }
                else if (element.attachedBonds.length == 8) { incAngle = 15; }
                else if (element.attachedBonds.length > 4) { incAngle = 90; }
                else if (element.attachedBonds.length == 4) { incAngle = 45; }
                else { incAngle = 90; }
                if (persistentElems.INC_ANGLE_CHECKBOX.checked) {
                    persistentElems.ADD_ANGLE.value = ((addAngle + incAngle) % 360).toString();
                }
                element.attachedBonds.push(newBond);
                if (newBond.attachedElem) {
                    newBond.attachedElem.parentElem = element;
                }
                mainRender(currentMolecule);
                inspectElemFn((newBond.attachedElem && persistentElems.SWITCH_INSPECT_CHECKBOX.checked) ? newBond.attachedElem : element);
            }
        });

        let persistentElems = getOrInitPersistentElems();
        let bondPreset = persistentElems.ADD_SELECT;
        let bondAngle = persistentElems.ADD_ANGLE;
        let incAngleCheckbox = persistentElems.INC_ANGLE_CHECKBOX;
        let switchInspectCheckbox = persistentElems.SWITCH_INSPECT_CHECKBOX;
        let bondLength = persistentElems.BOND_LENGTH;

        return {
            addBtn,
            bondPreset,
            bondAngle,
            incAngleCheckbox,
            switchInspectCheckbox,
            bondLength
        }
    }

    /**
     * @param {ChemElem} element 
     * @param {(element: ChemElem) => any} inspectElemFn 
     */
    constructor(element, inspectElemFn) {
        this.element = element;
        this.generalStuff = InspectorWindow.#createGeneralInspectorStuff(element, inspectElemFn);
        this.bondsStuff = {
            title: createSimpleElement("h3", Translations.TEXTS.INSPECTOR_TITLE_BONDS),
            bonds: (element.parentElem ? [InspectorWindow.#createBondInspectorStuff(element, "parent", inspectElemFn)] : []).concat(element.attachedBonds.map(b => InspectorWindow.#createBondInspectorStuff(element, b, inspectElemFn))),
            newBond: InspectorWindow.#createAddBondInspectorStuff(element, inspectElemFn)
        };
    }

    /**
     * @param {HTMLElement} container 
     */
    openAndRender(container) {
        selectedElem = this.element;
        hightlightedElems.clear();
        /** @type {HTMLElement} */
        let child;
        while (child = container.firstElementChild) {
            child.remove();
        }

        let inspectorGeneral = createSimpleElement("div", "", {classes: ["inspector-general"]});
        inspectorGeneral.appendChild(this.generalStuff.closeBtn);
        inspectorGeneral.appendChild(this.generalStuff.titleGeneral);
        inspectorGeneral.appendChild(this.generalStuff.labelElementText);
        inspectorGeneral.appendChild(this.generalStuff.inputElementText);
        inspectorGeneral.appendChild(document.createElement("br"));
        inspectorGeneral.appendChild(this.generalStuff.sparseRemoveBtn);
        inspectorGeneral.appendChild(this.generalStuff.fullRemoveBtn);
        container.appendChild(inspectorGeneral);
        container.appendChild(this.bondsStuff.title);
        let inspectorBonds = createSimpleElement("div", "", {classes: ["inspector-bonds"]});
        let inspectorBondsList = createSimpleElement("div", "", {classes: ["inspector-bonds-list"]});
        for (let bondStuff of this.bondsStuff.bonds) {
            let div = createSimpleElement("div", "", {classes: ["inspector-bond"]});
            div.appendChild(bondStuff.removeBtn);
            div.appendChild(createSimpleElement("label", Translations.TEXTS.INSPECTOR_BOND_ATTACHED_ELEM));
            div.appendChild(bondStuff.attachedElement);
            div.appendChild(document.createElement("br"));
            div.appendChild(createSimpleElement("label", Translations.TEXTS.INSPECTOR_BOND_TYPE));
            div.appendChild(bondStuff.bondType);
            div.appendChild(document.createElement("br"));
            div.appendChild(createSimpleElement("label", Translations.TEXTS.INSPECTOR_BOND_ANGLE));
            div.appendChild(bondStuff.bondAngle);
            div.appendChild(document.createElement("br"));
            div.appendChild(createSimpleElement("label", Translations.TEXTS.INSPECTOR_BOND_LENGTH));
            div.appendChild(bondStuff.bondLength);
            inspectorBondsList.appendChild(div);
        }
        inspectorBonds.appendChild(inspectorBondsList);
        container.appendChild(inspectorBonds);
        let inspectorAddBond = createSimpleElement("div", "", {classes: ["inspector-add-bond"]});
        inspectorAddBond.appendChild(createSimpleElement("h4", Translations.TEXTS.INSPECTOR_TITLE_ADD_BOND));
        inspectorAddBond.appendChild(this.bondsStuff.newBond.addBtn);
        inspectorAddBond.appendChild(document.createElement("br"));
        inspectorAddBond.appendChild(createSimpleElement("label", Translations.TEXTS.INSPECTOR_ADD_BOND_PRESET));
        inspectorAddBond.appendChild(this.bondsStuff.newBond.bondPreset);
        inspectorAddBond.appendChild(document.createElement("br"));
        inspectorAddBond.appendChild(createSimpleElement("label", Translations.TEXTS.INSPECTOR_ADD_BOND_ANGLE));
        inspectorAddBond.appendChild(this.bondsStuff.newBond.bondAngle);
        inspectorAddBond.appendChild(document.createElement("br"));
        inspectorAddBond.appendChild(createSimpleElement("label", Translations.TEXTS.INSPECTOR_ADD_BOND_LENGTH));
        inspectorAddBond.appendChild(this.bondsStuff.newBond.bondLength);
        inspectorAddBond.appendChild(document.createElement("br"));
        inspectorAddBond.appendChild(createSimpleElement("label", Translations.TEXTS.INSPECTOR_ADD_BOND_INC_ANGLE));
        inspectorAddBond.appendChild(this.bondsStuff.newBond.incAngleCheckbox);
        inspectorAddBond.appendChild(document.createElement("br"));
        inspectorAddBond.appendChild(createSimpleElement("label", Translations.TEXTS.INSPECTOR_ADD_BOND_SWITCH_INSPECT));
        inspectorAddBond.appendChild(this.bondsStuff.newBond.switchInspectCheckbox);
        container.appendChild(inspectorAddBond);

        container.classList.add("active");
    }
}

window.addEventListener("load", () => {
    mainRender(currentMolecule);
});

/** @type {Molecule} */
var currentMolecule;
/** @type {ChemElem?} */
var selectedElem = null;
/** @type {Set<ChemElem>} */
var hightlightedElems = new Set();

/**
 * @returns {Molecule}
 */
export function getCurrentMolecule() {
    return currentMolecule;
}

/**
 * @param {Molecule} molecule
 */
export function setCurrentMolecule(molecule) {
    currentMolecule = molecule;
    closeInspector();
    mainRender(currentMolecule);
    updateMoleculeSize();
}

globalThis.shadyChemicalsDebug_getCurrentMolecule = getCurrentMolecule;
globalThis.shadyChemicalsDebug_MoleculeObj = Molecule;