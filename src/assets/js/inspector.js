import { Bond, BondType, ChemElem, Molecule, MoleculeRenderer, PartialCharge } from "./molecule.js";
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

export class InspectorBondHTML {
    /** @type {HTMLElement} */
    root;

    /** @type {HTMLButtonElement} */
    toElemBtn;

    /** @type {HTMLButtonElement} */
    bondDropdownBtn;

    /** @type {{btn: HTMLButtonElement, options: HTMLAnchorElement[]}} */
    bondTypeDropdown;

    /** @type {HTMLInputElement} */
    bondLengthInput;

    /** @type {HTMLInputElement} */
    bondAngleInput;

    /** @type {HTMLButtonElement} */
    bondDeleteButton;

    /**
     * @param {HTMLDivElement} bondRootHtml The root element of a bond
     */
    constructor(bondRootHtml) {
        this.toElemBtn = bondRootHtml.querySelector(".inspector-bond-elem-name");
        this.bondDropdownBtn = bondRootHtml.querySelector(".inspector-bond-dropdown");
        this.bondTypeDropdown = {
            btn: bondRootHtml.querySelector(".inspector-bond-select-type-btn"),
            options: Array.from(bondRootHtml.querySelector(".dropdown .dropdown-menu:has(> li)").children).map(li => li.children[0])
        };
        this.bondLengthInput = bondRootHtml.querySelector(".inspector-bond-length");
        this.bondAngleInput = bondRootHtml.querySelector(".inspector-bond-angle");
        this.bondDeleteButton = bondRootHtml.querySelector(".inspector-bond-elem-remove");
        this.root = bondRootHtml;
    }

    /**
     * Returns a copy of this bond's HTML
     * @returns {InspectorBondHTML}
     */
    clone() {
        return new InspectorBondHTML(this.root.cloneNode(true));
    }
}

export class InspectorBond {
    /** @type {ChemElem} */
    fromElem;

    /** @type {ChemElem?} */
    toElem;

    /** @type {Bond} */
    bond;

    /** @type {number} */
    bondLength;

    /** @type {BondType} */
    bondType;

    /** @type {number} */
    bondAngle;

    /** @type {InspectorBondHTML} */
    html;

    /**
     * @param {ChemElem} from 
     * @param {ChemElem?} to 
     * @param {Bond} bond 
     * @param {InspectorBondHTML} baseHtml
     * @param {(element: ChemElem) => any} inspectElemFn  
     */
    constructor(from, to, bond, baseHtml, inspectElemFn) {
        this.html = baseHtml.clone();
        this.fromElem = from;
        this.toElem = to;
        this.bond = bond;

        if (this.toElem === null) {
            this.html.toElemBtn.innerHTML = "+";
            this.html.toElemBtn.onclick = () => {
                this.bond.attachedElem = new ChemElem("C", { parentElem: this.fromElem });
                this.toElem = this.bond.attachedElem;
                inspectElemFn(this.toElem);
            };
        } else {
            this.html.toElemBtn.innerHTML = to.nameAsHTML;
            this.html.toElemBtn.onclick = () => inspectElemFn(this.toElem);
            mainMoleculeRenderer.render(currentMolecule);
            mainMoleculeRenderer.updateMoleculeSize();
        }

        this.html.bondAngleInput.value = bond.angle.toString();
        this.html.bondAngleInput.onchange = () => {
            let num = Number.parseFloat(this.html.bondAngleInput.value);
            num = (num + 3600) % 360;
            this.html.bondAngleInput.value = num.toString();
            this.bond.angle = num;
            mainMoleculeRenderer.render(currentMolecule);
            mainMoleculeRenderer.updateMoleculeSize();
        };

        this.html.bondDropdownBtn.childNodes[0].textContent = bond.length.toString();
        this.html.bondLengthInput.value = bond.length.toString();
        this.html.bondLengthInput.onchange = () => {
            let num = Number.parseFloat(this.html.bondLengthInput.value);
            num = Math.min(Math.max(num, 0.25), 4);
            this.html.bondLengthInput.value = num.toString();
            this.bond.length = num;
            this.html.bondDropdownBtn.childNodes[0].textContent = num.toString();
            mainMoleculeRenderer.render(currentMolecule);
            mainMoleculeRenderer.updateMoleculeSize();
        };

        this.html.bondTypeDropdown.btn.querySelector("img").src = `/assets/png/${bond.bondType}_bond.png`;
        this.html.bondDropdownBtn.childNodes[1].src = `/assets/png/${bond.bondType}_bond.png`;
        this.html.bondTypeDropdown.options.forEach(opt => {
            /** @type {BondType} */
            let bond = opt.attributes.getNamedItem("data-bond").value;
            opt.onclick = () => {
                this.html.bondTypeDropdown.btn.querySelector("img").src = `/assets/png/${bond}_bond.png`;
                this.html.bondDropdownBtn.childNodes[1].src = `/assets/png/${bond}_bond.png`;
                this.bond.bondType = bond;
                mainMoleculeRenderer.render(currentMolecule);
                mainMoleculeRenderer.updateMoleculeSize();
            };
        });

        this.html.bondDeleteButton.onclick = () => {
            if (this.toElem !== null) {
                this.toElem.unattachSelf();
                inspectElemFn(this.fromElem);
            } else {
                inspectElemFn(this.fromElem);
                let i = 0;
                for (let bond of this.fromElem.attachedBonds) {
                    if (bond === this.bond) {
                        this.fromElem.attachedBonds.splice(i, 1);
                        break;
                    }
                    i++;
                }
            }
        };
    }

    /**
     * @param {HTMLElement} bondsList 
     */
    insertInto(bondsList) {
        bondsList.appendChild(this.html.root);
    }
}

export class InspectorAddBondDropdown {
    /** @type {HTMLElement} */
    baseHtml;

    /** @type {HTMLInputElement[]} */
    bondElemTypeBtns;

    /** @type {HTMLInputElement} */
    bondAngleInput;

    /** @type {HTMLButtonElement} */
    addBondBtn;

    /** @type {HTMLButtonElement} */
    closeBtn;

    /** @type {{btn: HTMLButtonElement, opts: HTMLAnchorElement[]}} */
    bondTypeSelection;

    /** @type {HTMLInputElement} */
    bondLengthInput;

    /** @type {HTMLInputElement} */
    bondSelectElemCheck;

    /** @type {HTMLInputElement} */
    bondChangeAngleCheck;

    /** @type {{[string]: HTMLElement}} */
    bondElemTypeTabs;

    /** @type {BondType} */
    selectedBondType = BondType.SINGLE;

    /**
     * @param {HTMLElement} baseHtml 
     * @param {boolean} [skipInit]
     */
    constructor(baseHtml, skipInit) {
        this.baseHtml = baseHtml;
        this.bondElemTypeBtns = Array.from(baseHtml.querySelector(".add-bond-elem-type").querySelectorAll("input[type=\"radio\"]"));
        this.bondAngleInput = baseHtml.querySelector(".add-bond-angle");
        this.addBondBtn = baseHtml.querySelector(".add-bond-add");
        this.closeBtn = baseHtml.querySelector(".add-bond-close");
        this.bondTypeSelection = {
            btn: baseHtml.querySelector(".inspector-add-bond-select-type-btn"),
            opts: Array.from(baseHtml.querySelector(".inspector-add-bond-select-type-btn + .dropdown-menu").querySelectorAll("a")),
        };
        this.bondLengthInput = baseHtml.querySelector(".inspector-add-bond-length");
        this.bondSelectElemCheck = baseHtml.querySelector("#inspector-add-bond-select");
        this.bondChangeAngleCheck = baseHtml.querySelector("#inspector-add-bond-inc-angle");
        this.bondElemTypeTabs = Object.fromEntries(Array.from(baseHtml.querySelectorAll(".row[data-bond-tab]")).map(elem => [elem.getAttribute("data-bond-tab"), elem]));

        if (!skipInit) {
            this.bondElemTypeBtns.forEach(btn => {
                btn.onchange = () => {
                    Object.values(this.bondElemTypeTabs).forEach(t => t.classList.remove("show"));
                    this.bondElemTypeTabs[btn.value].classList.add("show");
                };
            });
            this.bondAngleInput.value = "0";
            this.bondAngleInput.onchange = () => {
                let num = Number.parseFloat(this.bondAngleInput.value);
                num = (num + 3600) % 360;
                this.bondAngleInput.value = num.toString();
            };
            this.bondTypeSelection.opts.forEach(opt => {
                let bond = opt.getAttribute("data-bond");
                opt.onclick = () => {
                    this.bondTypeSelection.btn.children[0].src = `/assets/png/${bond}_bond.png`;
                    this.selectedBondType = bond;
                };
            })
            this.bondLengthInput.value = "1";
            this.bondLengthInput.onchange = () => {
                let num = Number.parseFloat(this.bondLengthInput.value);
                num = Math.min(Math.max(num, 0.25), 4);
                this.bondLengthInput.value = num.toString();
            };
        }
    }
}

export class InspectorHTML {
    /** @type {HTMLElement} */
    baseHtml;

    /** @type {HTMLButtonElement} */
    closeBtn;
    
    /** @type {HTMLInputElement} */
    elemName;
    
    /** @type {{partial: HTMLButtonElement, full: HTMLButtonElement}} */
    deleteBtns;
    
    /** @type {HTMLElement} */
    bondList;

    /** @type {InspectorBondHTML} */
    bondBase;

    /** @type {InspectorAddBondDropdown} */
    addBondDropdown;

    /**
     * @param {HTMLElement} baseHtml 
     */
    constructor(baseHtml) {
        this.baseHtml = baseHtml;
        this.closeBtn = this.baseHtml.querySelector("#inspector-close");
        this.elemName = this.baseHtml.querySelector("#inspector-name");
        this.deleteBtns = {
            partial: this.baseHtml.querySelector("#inspector-remove-elem"),
            full: this.baseHtml.querySelector("#inspector-remove-elem-full")
        };
        this.bondList = this.baseHtml.querySelector(".inspector-bonds");
        if (this.bondList.children.length > 0) {
            this.bondBase = (new InspectorBondHTML(this.bondList.children[0])).clone();
        }
        baseHtml.querySelector(".inspector-bonds").replaceChildren();
        this.addBondDropdown = new InspectorAddBondDropdown(this.baseHtml.querySelector(".inspector-add-bond > div > .dropdown-menu"));
    }

    /**
     * Returns a clone of this html
     * @returns {InspectorHTML}
     */
    clone() {
        let html = new InspectorHTML(this.baseHtml.cloneNode(true));
        html.bondBase = this.bondBase.clone();
        html.baseHtml.querySelector(".inspector-add-bond > div > .dropdown-menu").replaceWith(this.addBondDropdown.baseHtml);
        return html;
    }

    /**
     * @param {HTMLElement} container 
     */
    insertInto(container) {
        container.replaceChildren(...this.baseHtml.childNodes);
    }
}

export class InspectorWindow {
    /** @type {ChemElem} */
    element;

    /** @type {InspectorHTML} */
    html;

    /** @type {(element: ChemElem) => any} */
    inspectElemFn;
    
    /**
     * @param {ChemElem} element 
     * @param {InspectorHTML} baseHtml 
     * @param {(element: ChemElem) => any} inspectElemFn 
     */
    constructor(element, baseHtml, inspectElemFn) {
        this.element = element;
        this.html = baseHtml.clone();
        this.inspectElemFn = inspectElemFn;
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

        this.html.closeBtn.onclick = closeInspector;

        this.html.elemName.value = this.element.name;
        this.html.elemName.oninput = () => {
            this.element.name = this.html.elemName.value;
            mainMoleculeRenderer.render(currentMolecule);
            mainMoleculeRenderer.updateMoleculeSize();
        };
        if (this.element.parentElem !== null) {
            this.html.deleteBtns.partial.onclick = () => {
                this.element.parentBond.attachedElem = undefined;
                closeInspector();
            };
            this.html.deleteBtns.full.onclick = () => {
                this.element.unattachSelf();
                closeInspector();
            };
        } else {
            this.html.deleteBtns.partial.classList.add("disabled");
            this.html.deleteBtns.partial.title = Translations.TEXTS.INSPECTOR_ELEM_CANNOT_REMOVE;
            this.html.deleteBtns.full.classList.add("disabled");
            this.html.deleteBtns.full.title = Translations.TEXTS.INSPECTOR_ELEM_CANNOT_REMOVE;
        }

        if (this.element.parentElem) {
            let inspectorBond = new InspectorBond(this.element, this.element.parentElem, this.element.parentBond, this.html.bondBase, this.inspectElemFn);
            inspectorBond.insertInto(this.html.bondList);
        }
        for (let bond of this.element.attachedBonds) {
            let inspectorBond = new InspectorBond(this.element, bond.attachedElem ?? null, bond, this.html.bondBase, this.inspectElemFn);
            inspectorBond.insertInto(this.html.bondList);
        }

        this.html.insertInto(container);
        container.classList.add("active");
    }
}

window.addEventListener("load", () => {
    mainMoleculeRenderer.render(currentMolecule);
});

/** @type {Molecule} */
var currentMolecule;
/** @type {ChemElem?} */
var selectedElem = null;
/** @type {Set<ChemElem>} */
var hightlightedElems = new Set();
/** @type {MoleculeRenderer} */
export var mainMoleculeRenderer = new MoleculeRenderer(document.getElementById("main_container"));

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
    mainMoleculeRenderer.render(currentMolecule);
    mainMoleculeRenderer.updateMoleculeSize();
}

globalThis.shadyChemicalsDebug_getCurrentMolecule = getCurrentMolecule;
globalThis.shadyChemicalsDebug_MoleculeObj = Molecule;