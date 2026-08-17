import { Bond, BondType, ChemElem, Molecule, MoleculePositioning, MoleculeRenderer, PartialCharge } from "./molecule.js";
/** @import {BondAngle} from "./molecule.js" */

import { Translations } from "./translations.js";
import { createButton, createNumberInput, createSelect, createSimpleElement, createTextInput, createCheckboxInput } from "./html_helper.js";
import { NEW_BOND_PRESETS } from "./bond_presets.js";
import { LIBRARY_SELECTOR_HTML, LIBRARY_SELECTOR_OPTIONS_PRESETS, MoleculeLibrary, MoleculeLibrarySelector } from "./libraries.js";

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
    bootstrap.Dropdown.getOrCreateInstance(document.querySelector("#inspector .inspector-add-bond .dropup")).hide();
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
        let isParent = bond.attachedElem === from;

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
            this.html.toElemBtn.onpointerenter = () => hightlightedElems.add(this.toElem);
            this.html.toElemBtn.onpointerleave = () => hightlightedElems.delete(this.toElem);
            mainMoleculeRenderer.render(currentMolecule);
            mainMoleculeRenderer.updateMoleculeSize();
        }

        this.html.bondAngleInput.value = ((bond.angle + (isParent ? 180 : 0)) % 360).toString();
        this.html.bondAngleInput.onchange = () => {
            let num = isNaN(this.html.bondAngleInput.value) ? 0 : Number.parseFloat(this.html.bondAngleInput.value);
            num = ((Number.isNaN(num) ? 0 : num) - (isParent ? 180 : 0) + 3600) % 360;
            this.html.bondAngleInput.value = ((num + (isParent ? 180 : 0)) % 360).toString();
            this.bond.angle = num;
            mainMoleculeRenderer.render(currentMolecule);
            mainMoleculeRenderer.updateMoleculeSize();
        };

        this.html.bondDropdownBtn.childNodes[0].textContent = bond.length.toString();
        this.html.bondLengthInput.value = bond.length.toString();
        this.html.bondLengthInput.onchange = () => {
            let num = isNaN(this.html.bondLengthInput.value) ? 0 : Number.parseFloat(this.html.bondLengthInput.value);
            num = Math.min(Math.max((Number.isNaN(num) ? 0 : num), 0.25), 4);
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

        if (isParent) {
            this.html.bondDeleteButton.classList.add("disabled");
            this.html.bondDeleteButton.title = Translations.TEXTS.INSPECTOR_BOND_CANNOT_REMOVE;
        } else {
            this.html.bondDeleteButton.onclick = () => {
                if (this.toElem !== null) {
                    this.toElem.unattachSelf();
                    mainMoleculeRenderer.render(currentMolecule);
                    mainMoleculeRenderer.updateMoleculeSize();
                    inspectElemFn(this.fromElem);
                } else {
                    let i = 0;
                    for (let bond of this.fromElem.attachedBonds) {
                        if (bond === this.bond) {
                            this.fromElem.attachedBonds.splice(i, 1);
                            break;
                        }
                        i++;
                    }
                    mainMoleculeRenderer.render(currentMolecule);
                    mainMoleculeRenderer.updateMoleculeSize();
                    inspectElemFn(this.fromElem);
                }
            };
        }
    }

    /**
     * @param {HTMLElement} bondsList 
     */
    insertInto(bondsList) {
        bondsList.appendChild(this.html.root);
    }
}

class AddBondElementTab {
    /** @type {HTMLElement} */
    baseHtml;
    
    /** @type {HTMLInputElement} */
    elemNameInput;

    /**
     * @param {HTMLElement} baseHtml 
     */
    constructor(baseHtml) {
        this.baseHtml = baseHtml;
        this.elemNameInput = baseHtml.querySelector(".inspector-add-bond-elem-name");
    }
}

class AddBondGroupTab {
    /** @type {HTMLElement} */
    baseHtml;

    /** @type {HTMLButtonElement} */
    elemGroupSelectBtn;

    /** @type {Molecule?} */
    selectedBondGroup;

    constructor(baseHtml) {
        this.baseHtml = baseHtml;
        this.elemGroupSelectBtn = baseHtml.querySelector(".inspector-add-bond-select-group");
        this.elemGroupSelectBtn.onclick = () => {
            MoleculeLibrary.load("bonds").then(lib => {
                let opts = LIBRARY_SELECTOR_OPTIONS_PRESETS.BOND_SELECTOR;
                let selector = new MoleculeLibrarySelector(lib, LIBRARY_SELECTOR_HTML, opts);
                selector.open(mol => {
                    this.selectedBondGroup = mol;
                    this.elemGroupSelectBtn.querySelector(".btn-contents").replaceChildren();
                    let molRenderer = new MoleculeRenderer(this.elemGroupSelectBtn.querySelector(".btn-contents"), false, MoleculePositioning.CENTER_HORIZ_ROOT);
                    opts.moleculeRenderModifier.pre(mol);
                    molRenderer.render(mol);
                    opts.moleculeRenderModifier.post(mol);
                    molRenderer.updateMoleculeSize();
                });
            });
        };
    }
}

class AddBondRingTab {
    /** @type {HTMLElement} */
    baseHtml;

    /** @type {HTMLInputElement} */
    elemNameInput;

    /** @type {HTMLInputElement} */
    ringSizeInput;

    /** @type {number} */
    lastRingSize;

    /** @type {HTMLInputElement} */
    ringBondCountInput;

    /** @type {number} */
    get ringSize() {
        return Number.parseInt(this.ringSizeInput.value);
    }

    /** @type {number} */
    get ringBondCount() {
        return Number.parseInt(this.ringBondCountInput.value);
    }

    /** @param {number} num  */
    set ringSize(num) {
        this.ringSizeInput.value = Math.floor(Math.min(Math.max(num, 3), 18)).toString();
    }

    /** @param {number} num  */
    set ringBondCount(num) {
        this.ringBondCountInput.value = Math.floor(Math.min(Math.max(num, 3), 18)).toString();
    }

    constructor(baseHtml) {
        this.baseHtml = baseHtml;
        this.elemNameInput = baseHtml.querySelector(".inspector-add-bond-elem-name");
        this.ringSizeInput = baseHtml.querySelector("#inspector-add-bond-ring-size");
        this.ringBondCountInput = baseHtml.querySelector("#inspector-add-bond-ring-bond-count");
        
        this.ringSize = 3;
        this.lastRingSize = this.ringSize;
        this.ringBondCount = 3;

        this.ringSizeInput.onchange = () => {
            this.ringSize = this.ringSize; // Automatically clamps to [3;18]
            this.ringBondCount += this.ringSize - this.lastRingSize; // Automatically clamps to [3;18]
            this.lastRingSize = this.ringSize;
        };
    }
}

const ELEM_TYPE_TO_CLASS = Object.freeze({
    element: AddBondElementTab,
    group: AddBondGroupTab,
    ring: AddBondRingTab
});

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

    /** @type {{"element": AddBondElementTab, "group": AddBondGroupTab, "ring": AddBondRingTab}} */
    bondElemTypeTabs;

    /** @type {BondType} */
    selectedBondType = BondType.SINGLE;
    
    /** @type {"element"|"group"|"ring"} */
    selectedElemType = "element";

    /** @type {ChemElem} */
    currentElem;

    /** @type {(elem: ChemElem) => any} */
    inspectElemFn;

    /** @type {number} */
    get bondAngle() {
        return Number.parseFloat(this.bondAngleInput.value);
    }

    /** @type {number} */
    get bondLength() {
        return Number.parseFloat(this.bondLengthInput.value);
    }

    #addBond() {
        let canInspect = true;
        let elemName;
        switch (this.selectedElemType) {
            case "element":
                elemName = this.bondElemTypeTabs.element.elemNameInput.value;
                canInspect &= elemName.length > 0;
                this.currentElem.attachElement(this.selectedBondType, this.bondAngle, this.bondLength, elemName.length > 0 ? elemName : undefined);
                mainMoleculeRenderer.render(currentMolecule);
                mainMoleculeRenderer.updateMoleculeSize();
                break;
            case "group":
                let elem = this.bondElemTypeTabs.group.selectedBondGroup;
                if (elem === null) { return; }
                elem = elem.clone();
                elem.rotate(this.bondAngle);
                this.currentElem.attachElement(this.selectedBondType, this.bondAngle, this.bondLength, elem.root);
                mainMoleculeRenderer.render(currentMolecule);
                mainMoleculeRenderer.updateMoleculeSize();
                break;
            case "ring":
                elemName = this.bondElemTypeTabs.ring.elemNameInput.value;
                let ringSize = this.bondElemTypeTabs.ring.ringSize;
                let ringBondCount = this.bondElemTypeTabs.ring.ringBondCount;
                if (elemName.length === 0) { return; }
                let currElem = this.currentElem;
                let angleDelta = 360 - (360 / ringSize);
                for (let i=0; i < ringBondCount; i++) {
                    let newElem = i == ringBondCount - 1 ? undefined : new ChemElem(elemName);
                    currElem.attachElement(this.selectedBondType, this.bondAngle + i*angleDelta, this.bondLength, newElem);
                    currElem = newElem;
                }
                break;
        }
        if (this.bondChangeAngleCheck.checked) {
            /** @type {number} */
            let newAngle = this.bondAngle;
            let bondCount = this.currentElem.attachedBonds.length;
            if (bondCount < 8 && bondCount != 4) {
                newAngle += 90;
            } else if (bondCount == 4) {
                newAngle += 45;
            } else if (bondCount == 8) {
                newAngle += 15;
            } else {
                newAngle += 30;
            }
            this.bondAngleInput.value = (newAngle % 360).toString();
        }
        if (this.bondSelectElemCheck.checked && canInspect) {
            this.inspectElemFn(this.currentElem.attachedBonds[this.currentElem.attachedBonds.length - 1].attachedElem);
        } else {
            this.inspectElemFn(this.currentElem);
        }
    }

    /**
     * @param {HTMLElement} baseHtml 
     * @param {(elem: ChemElem) => any} inspectElemFn 
     * @param {boolean} [skipInit]
     */
    constructor(baseHtml, inspectElemFn, skipInit) {
        this.inspectElemFn = inspectElemFn;
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
        this.bondElemTypeTabs = Object.fromEntries(Array.from(baseHtml.querySelectorAll(".row[data-bond-tab]")).map(elem => [elem.getAttribute("data-bond-tab"), new ELEM_TYPE_TO_CLASS[elem.getAttribute("data-bond-tab")](elem)]));

        if (!skipInit) {
            this.bondElemTypeBtns.forEach(btn => {
                btn.onchange = () => {
                    Object.values(this.bondElemTypeTabs).forEach(t => {
                        t.baseHtml.classList.remove("show");
                    });
                    this.bondElemTypeTabs[btn.value].baseHtml.classList.add("show");
                    this.selectedElemType = btn.value;
                };
            });
            this.bondAngleInput.value = "0";
            this.bondAngleInput.onchange = () => {
                let num = isNaN(this.bondAngleInput.value) ? 0 : Number.parseFloat(this.bondAngleInput.value);
                num = ((Number.isNaN(num) ? 0 : num) + 3600) % 360;
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
                let num = isNaN(this.bondLengthInput.value) ? 0 : Number.parseFloat(this.bondLengthInput.value);
                num = Math.min(Math.max((Number.isNaN(num) ? 0 : num), 0.25), 4);
                this.bondLengthInput.value = num.toString();
            };
            this.addBondBtn.onclick = () => this.#addBond();
            this.closeBtn.onclick = () => {
                let dropdown = bootstrap.Dropdown.getOrCreateInstance(baseHtml.parentElement);
                dropdown.hide();
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
        this.addBondDropdown = new InspectorAddBondDropdown(this.baseHtml.querySelector(".inspector-add-bond > div > .dropdown-menu"), null);
    }

    /**
     * Returns a clone of this html
     * @returns {InspectorHTML}
     */
    clone() {
        let html = new InspectorHTML(this.baseHtml.cloneNode(true));
        html.bondBase = this.bondBase.clone();
        html.addBondDropdown = this.addBondDropdown;
        html.baseHtml.querySelector(".inspector-add-bond > div > .dropdown-menu").replaceWith(this.addBondDropdown.baseHtml);
        return html;
    }

    /**
     * @param {HTMLElement} container 
     * @param {(elem: ChemElem) => any} inspectElemFn 
     */
    insertInto(container, inspectElemFn) {
        this.addBondDropdown.inspectElemFn = inspectElemFn;
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
                mainMoleculeRenderer.render(currentMolecule);
                mainMoleculeRenderer.updateMoleculeSize();
                closeInspector();
            };
            this.html.deleteBtns.full.onclick = () => {
                this.element.unattachSelf();
                mainMoleculeRenderer.render(currentMolecule);
                mainMoleculeRenderer.updateMoleculeSize();
                closeInspector();
            };
            this.html.deleteBtns.partial.classList.remove("disabled");
            this.html.deleteBtns.partial.title = "";
            this.html.deleteBtns.full.classList.remove("disabled");
            this.html.deleteBtns.full.title = "";
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

        this.html.addBondDropdown.currentElem = this.element;

        this.html.insertInto(container, this.inspectElemFn);
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
export var mainMoleculeRenderer = new MoleculeRenderer(document.getElementById("main_container"), true);

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