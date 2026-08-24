import { Bond, BondType, ChemElem, Molecule, MoleculePositioning, MoleculeRenderer, PartialCharge } from "./molecule.js";
/** @import {BondAngle} from "./molecule.js" */

import { Translations } from "./translations.js";
import { INPUT_SCROLL_DELTA, makeNumInputScrollable, makeNumInputIndirectlyScrollable } from "./html_helper.js";
import { LIBRARY_SELECTOR_HTML, LIBRARY_SELECTOR_OPTIONS_PRESETS, MoleculeLibrary, MoleculeLibrarySelector } from "./libraries.js";

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

export function closeInspector() {
    document.getElementById("inspector").classList.remove("active");
    bootstrap.Dropdown.getOrCreateInstance(document.querySelector("#inspector .inspector-add-bond .dropup")).hide();
    selectedElem = null;
    currentlyOpenInspectorWindow = null;
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
            // this.html.toElemBtn.onpointerenter = () => hightlightedElems.add(this.toElem);
            // this.html.toElemBtn.onpointerleave = () => hightlightedElems.delete(this.toElem);
            this.html.toElemBtn.onpointerenter = () => document.getElementById(`elem-${this.toElem.id}`).classList.add("highlighted");
            this.html.toElemBtn.onpointerleave = () => document.getElementById(`elem-${this.toElem.id}`).classList.remove("highlighted");
            // mainMoleculeRenderer.render(currentMolecule);
            // mainMoleculeRenderer.updateMoleculeSize();
        }

        this.html.bondAngleInput.value = ((bond.angle + (isParent ? 180 : 0)) % 360).toString();
        this.html.bondAngleInput.onchange = () => {
            let num = isNaN(this.html.bondAngleInput.value) ? 0 : Number.parseFloat(this.html.bondAngleInput.value);
            num = ((Number.isNaN(num) ? 0 : num) - (isParent ? 180 : 0) + 3600) % 360;
            this.html.bondAngleInput.value = ((num + (isParent ? 180 : 0)) % 360).toString();
            // addToMainMoleculeHistory();
            // this.bond.angle = num;
            let oldAngle = this.bond.angle;
            modifyMainMoleculeBond(this.bond, b => b.angle = num, b => b.angle = oldAngle);
            rerenderMainMolecule();
        };
        makeNumInputScrollable(this.html.bondAngleInput, 15, 45, 5);

        this.html.bondDropdownBtn.childNodes[0].textContent = bond.length.toString();
        this.html.bondLengthInput.value = bond.length.toString();
        this.html.bondLengthInput.onchange = () => {
            let num = isNaN(this.html.bondLengthInput.value) ? 0 : Number.parseFloat(this.html.bondLengthInput.value);
            num = Math.min(Math.max((Number.isNaN(num) ? 0 : num), 0.25), 4);
            this.html.bondLengthInput.value = num.toString();
            // addToMainMoleculeHistory();
            // this.bond.length = num;
            let oldLength = this.bond.length;
            modifyMainMoleculeBond(this.bond, b => b.length = num, b => b.length = oldLength);
            this.html.bondDropdownBtn.childNodes[0].textContent = num.toString();
            rerenderMainMolecule();
        };
        makeNumInputScrollable(this.html.bondLengthInput, 0.25, 1.0, 0.05);
        makeNumInputIndirectlyScrollable(this.html.bondDropdownBtn, this.html.bondLengthInput, 0.0, 0.25, 0.0);

        this.html.bondTypeDropdown.btn.querySelector("img").src = `/assets/png/${bond.bondType}_bond.png`;
        this.html.bondDropdownBtn.childNodes[1].src = `/assets/png/${bond.bondType}_bond.png`;
        this.html.bondTypeDropdown.options.forEach(opt => {
            /** @type {BondType} */
            let bond = opt.attributes.getNamedItem("data-bond").value;
            opt.onclick = () => {
                this.html.bondTypeDropdown.btn.querySelector("img").src = `/assets/png/${bond}_bond.png`;
                this.html.bondDropdownBtn.childNodes[1].src = `/assets/png/${bond}_bond.png`;
                // addToMainMoleculeHistory();
                // this.bond.bondType = bond;
                let oldBondType = this.bond.bondType;
                modifyMainMoleculeBond(this.bond, b => b.bondType = bond, b => b.bondType = oldBondType);
                rerenderMainMolecule();
            };
        });
        {
            let scrollDelta = 0;

            let t = this;
            /** @type {(event: WheelEvent) => any} */
            let scrollHandler = function(event) {
                scrollDelta += event.deltaY / INPUT_SCROLL_DELTA;
                if (Math.abs(scrollDelta) >= 1 && event.ctrlKey) {
                    let sign = Math.sign(scrollDelta);
                    scrollDelta -= Math.sign(scrollDelta) * Math.floor(Math.abs(scrollDelta));

                    for (let i=0; i < t.html.bondTypeDropdown.options.length; i++) {
                        if (t.bond.bondType === t.html.bondTypeDropdown.options[i].getAttribute("data-bond")) {
                            let j = Math.min(Math.max(i + sign, 0), t.html.bondTypeDropdown.options.length-1);

                            let opt = t.html.bondTypeDropdown.options[j];
                            let bond = opt.getAttribute("data-bond");

                            t.html.bondTypeDropdown.btn.querySelector("img").src = `/assets/png/${bond}_bond.png`;
                            t.html.bondDropdownBtn.childNodes[1].src = `/assets/png/${bond}_bond.png`;
                            // addToMainMoleculeHistory();
                            // t.bond.bondType = bond;
                            let oldBondType = t.bond.bondType;
                            modifyMainMoleculeBond(t.bond, b => b.bondType = bond, b => b.bondType = oldBondType);
                            rerenderMainMolecule();
                            break;
                        }
                    }
                }
            };

            this.html.bondTypeDropdown.btn.onpointerenter = () => {
                document.addEventListener("wheel", scrollHandler);
            };
            this.html.bondTypeDropdown.btn.onpointerleave = () => {
                document.removeEventListener("wheel", scrollHandler);
            };
            let scrollHandler2 = event => {
                if (event.ctrlKey) { scrollHandler(event); }
            };
            this.html.bondDropdownBtn.addEventListener("pointerenter", () => {
                document.addEventListener("wheel", scrollHandler2);
            });
            this.html.bondDropdownBtn.addEventListener("pointerleave", () => {
                document.removeEventListener("wheel", scrollHandler2);
            });
        }

        if (isParent) {
            // this.html.bondDeleteButton.classList.add("disabled");
            // this.html.bondDeleteButton.title = Translations.TEXTS.INSPECTOR_BOND_CANNOT_REMOVE;

            // When trying to delete the elements's parent, reparent to the current element
            this.html.bondDeleteButton.onclick = () => {
                this.fromElem.unattachSelf();

                // addToMainMoleculeHistory();
                // currentMolecule.root = this.fromElem;
                let oldRoot = currentMolecule.root;
                modifyMainMolecule(m => m.root = this.fromElem, m => m.root = oldRoot);
                rerenderMainMolecule();
                inspectElemFn(this.fromElem);
            };
        } else {
            this.html.bondDeleteButton.onclick = () => {
                if (this.toElem !== null) {
                    // addToMainMoleculeHistory();
                    // this.toElem.unattachSelf();
                    let oldParent = this.fromElem;
                    let oldElem = this.toElem;
                    let oldBondType = this.bond.bondType;
                    let oldBondAngle = this.bond.angle;
                    let oldBondLength = this.bond.length;
                    modifyMainMoleculeElem(oldParent, e => oldElem.unattachSelf(), e => e.attachElement(oldBondType, oldBondAngle, oldBondLength, oldElem));
                    rerenderMainMolecule();
                    inspectElemFn(this.fromElem);
                } else {
                    let i = 0;
                    for (let bond of this.fromElem.attachedBonds) {
                        if (bond === this.bond) {
                            // addToMainMoleculeHistory();
                            // this.fromElem.attachedBonds.splice(i, 1);
                            modifyMainMoleculeElem(this.fromElem, e => e.attachedBonds.splice(i, 1), e => e.attachedBonds.splice(i, 0, bond));
                            break;
                        }
                        i++;
                    }
                    rerenderMainMolecule();
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
        makeNumInputScrollable(this.ringSizeInput, 1);
        makeNumInputScrollable(this.ringBondCountInput, 1);
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
        let [bty, ba, bl] = [this.selectedBondType, this.bondAngle, this.bondLength];
        switch (this.selectedElemType) {
            case "element":
                elemName = this.bondElemTypeTabs.element.elemNameInput.value;
                canInspect &= elemName.length > 0;
                // addToMainMoleculeHistory();
                // this.currentElem.attachElement(this.selectedBondType, this.bondAngle, this.bondLength, elemName.length > 0 ? elemName : undefined);
                if (elemName.length > 0) {
                    let newSingularElem = new ChemElem(elemName);
                    modifyMainMoleculeElem(this.currentElem, e => e.attachElement(bty, ba, bl, newSingularElem), e => newSingularElem.unattachSelf());
                } else {
                    let tmpElem = new ChemElem("");
                    let index;
                    let bondIndex;
                    modifyMainMolecule(m => {
                        let b = m.index(this.currentElem.moleculeIndex).attachElement(bty, ba, bl, tmpElem);
                        index = tmpElem.moleculeIndex;
                        bondIndex = index.pop();
                        b.attachedElem = undefined;
                    }, m => m.index(index).attachedBonds.splice(bondIndex, 1));
                }
                rerenderMainMolecule(false);
                break;
            case "group":
                let elem = this.bondElemTypeTabs.group.selectedBondGroup;
                if (elem === null) { return; }
                elem = elem.clone();
                elem.rotate(this.bondAngle);
                // addToMainMoleculeHistory();
                // this.currentElem.attachElement(this.selectedBondType, this.bondAngle, this.bondLength, elem.root);
                modifyMainMoleculeElem(this.currentElem, e => e.attachElement(bty, ba, bl, elem.root), e => elem.root.unattachSelf());
                rerenderMainMolecule(false);
                break;
            case "ring":
                elemName = this.bondElemTypeTabs.ring.elemNameInput.value;
                let ringSize = this.bondElemTypeTabs.ring.ringSize;
                let ringBondCount = this.bondElemTypeTabs.ring.ringBondCount;
                if (elemName.length === 0) { return; }
                let currElem;
                /** @type {ChemElem?} */
                let firstRingElem;
                let angleDelta = 360 - (360 / ringSize);
                for (let i=0; i < ringBondCount; i++) {
                    let newElem = i == ringBondCount - 1 ? undefined : new ChemElem(elemName);
                    if (currElem) currElem.attachElement(bty, ba + i*angleDelta, bl, newElem);
                    currElem = newElem;
                    if (i == 0) { firstRingElem = newElem; }
                }
                modifyMainMoleculeElem(this.currentElem, e => e.attachElement(bty, ba, bl, firstRingElem), e => firstRingElem.unattachSelf() );
                rerenderMainMolecule(false);
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
            makeNumInputScrollable(this.bondAngleInput, 15, 45, 5);
            this.bondTypeSelection.opts.forEach(opt => {
                let bond = opt.getAttribute("data-bond");
                opt.onclick = () => {
                    this.bondTypeSelection.btn.children[0].src = `/assets/png/${bond}_bond.png`;
                    this.selectedBondType = bond;
                };
            });
            {
                let scrollDelta = 0;

                let t = this;
                /** @type {(event: WheelEvent) => any} */
                let scrollHandler = function(event) {
                    scrollDelta += event.deltaY / INPUT_SCROLL_DELTA;
                    if (Math.abs(scrollDelta) >= 1 && event.ctrlKey) {
                        let sign = Math.sign(scrollDelta);
                        scrollDelta -= Math.sign(scrollDelta) * Math.floor(Math.abs(scrollDelta));

                        for (let i=0; i < t.bondTypeSelection.opts.length; i++) {
                            if (t.selectedBondType === t.bondTypeSelection.opts[i].getAttribute("data-bond")) {
                                let j = Math.min(Math.max(i + sign, 0), t.bondTypeSelection.opts.length-1);

                                let opt = t.bondTypeSelection.opts[j];
                                let bond = opt.getAttribute("data-bond");

                                t.bondTypeSelection.btn.querySelector("img").src = `/assets/png/${bond}_bond.png`;
                                t.selectedBondType = bond;
                                break;
                            }
                        }
                    }
                };

                this.bondTypeSelection.btn.onpointerenter = () => {
                    document.addEventListener("wheel", scrollHandler);
                };
                this.bondTypeSelection.btn.onpointerleave = () => {
                    document.removeEventListener("wheel", scrollHandler);
                };
            }
            this.bondLengthInput.value = "1";
            this.bondLengthInput.onchange = () => {
                let num = isNaN(this.bondLengthInput.value) ? 0 : Number.parseFloat(this.bondLengthInput.value);
                num = Math.min(Math.max((Number.isNaN(num) ? 0 : num), 0.25), 4);
                this.bondLengthInput.value = num.toString();
            };
            makeNumInputScrollable(this.bondLengthInput, 0.25, 1.0, 0.05);
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

    /** @type {HTMLSelectElement} */
    elemAlignSelect;
    
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
        this.elemAlignSelect = this.baseHtml.querySelector("#inspector-elem-align");
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

/** @type {InspectorWindow?} */
let currentlyOpenInspectorWindow = null;

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
        if (selectedElem) {
            document.getElementById(`elem-${selectedElem.id}`).classList.remove("selected");
        }
        selectedElem = this.element;
        currentlyOpenInspectorWindow = this;
        unhighlightMolecule(currentMolecule.root);
        // hightlightedElems.clear();
        /** @type {HTMLElement} */
        let child;
        while (child = container.firstElementChild) {
            child.remove();
        }

        this.html.closeBtn.onclick = () => {
            document.getElementById(`elem-${this.element.id}`).classList.remove("selected");
            closeInspector();
        };

        this.html.elemName.value = this.element.name;
        this.html.elemName.oninput = () => {
            // addToMainMoleculeHistory();
            // this.element.name = this.html.elemName.value;
            let oldName = this.element.name;
            let newName = this.html.elemName.value;
            modifyMainMoleculeElem(this.element, e => e.name = newName, e => e.name = oldName);
            rerenderMainMolecule();
        };
        this.html.elemAlignSelect.value = this.element.elemAlign;
        this.html.elemAlignSelect.onchange = () => {
            // addToMainMoleculeHistory();
            // this.element.elemAlign = this.html.elemAlignSelect.value;
            let oldAlign = this.element.elemAlign;
            let newAlign = this.html.elemAlignSelect.value;
            modifyMainMoleculeElem(this.element, e => e.elemAlign = newAlign, e => e.elemAlign = oldAlign);
            rerenderMainMolecule();
        };
        if (this.element.parentElem !== null) {
            this.html.deleteBtns.partial.onclick = () => {
                // addToMainMoleculeHistory();
                // this.element.parentBond.attachedElem = undefined;
                let el = this.element;
                modifyMainMoleculeBond(this.element.parentBond, b => b.attachedElem = undefined, b => b.attachedElem = el);
                rerenderMainMolecule();
                closeInspector();
            };
            this.html.deleteBtns.full.onclick = () => {
                // addToMainMoleculeHistory();
                // this.element.unattachSelf();
                let el = this.element;
                let b = this.element.parentBond;
                let [bty, ba, bl] = [b.bondType, b.angle, b.length];
                modifyMainMoleculeElem(this.element.parentElem, e => el.unattachSelf(), e => e.attachElement(bty, ba, bl, el));
                rerenderMainMolecule();
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
        document.getElementById(`elem-${this.element.id}`).classList.add("selected");
    }
}

window.addEventListener("load", () => {
    mainMoleculeRenderer.render(currentMolecule);
});

/** @typedef {[(m: Molecule) => undefined, (m: Molecule) => undefined]} MoleculeModification A modification and it's inverse */

/** @type {MoleculeModification[]} */
var currentMoleculeHistory = [];

/** @type {MoleculeModification[]} */
var currentMoleculeRedoStack = [];

/** @type {Molecule} */
var currentMolecule;
/** @type {ChemElem?} */
var selectedElem = null;
/** @type {Set<ChemElem>} */
var hightlightedElems = new Set();
/** @type {MoleculeRenderer} */
export var mainMoleculeRenderer = new MoleculeRenderer(document.getElementById("main_container"), true);

export function addToMainMoleculeHistory() {
    throw new Error("Doesn't work like this no more!");
    // currentMoleculeHistory.push(currentMolecule.clone());
    // currentMoleculeRedoStack = [];
}

/**
 * Should be used to modify the main molecule, such that an undo/redo history
 * can be kept.
 * @param {(m: Molecule) => undefined} modification 
 * @param {(m: Molecule) => undefined} inverse 
 */
export function modifyMainMolecule(modification, inverse) {
    modification(currentMolecule);
    currentMoleculeHistory.push([modification, inverse]);
    currentMoleculeRedoStack = []
}

/**
 * Helper function to more easily modify elements that are part of the main
 * molecule.
 * @param {ChemElem} elem Should be somewhere in the main molecule's element tree
 * @param {(e: ChemElem) => undefined} modification 
 * @param {(e: ChemElem) => undefined} inverse 
 */
export function modifyMainMoleculeElem(elem, modification, inverse) {
    let index = elem.moleculeIndex;
    modifyMainMolecule(m => {unhighlightMolecule(elem); modification(m.index(index))}, m => {unhighlightMolecule(elem); inverse(m.index(index))});
}

/**
 * Helper function to more easily modify bonds that are part of the main
 * molecule.
 * @param {Bond} bond Should be somewhere in the main molecule's element tree
 * @param {(e: Bond) => undefined} modification 
 * @param {(e: Bond) => undefined} inverse 
 */
export function modifyMainMoleculeBond(bond, modification, inverse) {
    let index = bond.attachedElem.moleculeIndex;
    let bondIndex = index.pop();
    modifyMainMolecule(m => modification(m.index(index).attachedBonds[bondIndex]), m => inverse(m.index(index).attachedBonds[bondIndex]));
}

export function resetMainMoleculeHistory() {
    currentMoleculeHistory = [];
    currentMoleculeRedoStack = [];
}

export function undoMainMolecule() {
    console.log("undo", currentMoleculeHistory, currentMoleculeRedoStack);
    if (currentMoleculeHistory.length > 0) {
        let selectedElemIndex = selectedElem?.moleculeIndex;
        let mod = currentMoleculeHistory.pop();
        currentMoleculeRedoStack.push(mod);
        console.log("undo2", currentMoleculeHistory, currentMoleculeRedoStack);
        mod[1](currentMolecule);
        if (currentlyOpenInspectorWindow && !currentMolecule.index(selectedElemIndex)) {
            closeInspector();
        } else if (currentlyOpenInspectorWindow && selectedElem) {
            currentlyOpenInspectorWindow.inspectElemFn(selectedElem);
        }
        rerenderMainMolecule();
    }
}

export function redoMainMolecule() {
    console.log("redo", currentMoleculeHistory, currentMoleculeRedoStack);
    if (currentMoleculeRedoStack.length > 0) {
        let selectedElemIndex = selectedElem?.moleculeIndex;
        let mod = currentMoleculeRedoStack.pop();
        currentMoleculeHistory.push(mod);
        console.log("redo2", currentMoleculeHistory, currentMoleculeRedoStack);
        mod[0](currentMolecule);
        if (currentlyOpenInspectorWindow && !currentMolecule.index(selectedElemIndex)) {
            closeInspector();
        } else if (currentlyOpenInspectorWindow && selectedElem) {
            currentlyOpenInspectorWindow.inspectElemFn(selectedElem);
        }
        rerenderMainMolecule();
    }
}

/**
 * 
 * @param {boolean} [correctClass] (default = `true`) set to `false` to disable adding the `selected` class onto the element currently registed in the `selectedElem` variable
 */
export function rerenderMainMolecule(correctClass) {
    correctClass = correctClass ?? true;
    mainMoleculeRenderer.render(currentMolecule);
    mainMoleculeRenderer.updateMoleculeSize();
    if (selectedElem && correctClass) {
        waitForElm(`#elem-${selectedElem.id}`).then(elem => elem.classList.add("selected"));
    }
}

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