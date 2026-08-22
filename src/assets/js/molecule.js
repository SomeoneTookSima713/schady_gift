import { createSimpleElement } from "./html_helper.js";

/**
 * @readonly
 * @enum {string}
 */
export const BondType = Object.freeze({
    SINGLE: "single",
    DOUBLE: "double",
    TRIPLE: "triple",
    DOTTED: "dotted"
});

/**
 * @readonly
 * @enum {string}
 */
export const ElemAlign = Object.freeze({
    UP: "up",
    DOWN: "down",
    LEFT: "left",
    RIGHT: "right",
    CENTER: "center"
});

// /**
//  * @readonly
//  * @enum {number}
//  */
// const BondAngle = Object.freeze(Object.fromEntries([
//     0, 15, 30, 45, 60, 75, 90,
//     105, 120, 135, 150, 165, 180,
//     195, 210, 225, 240, 255, 270,
//     285, 300, 315, 330, 345
// ].map((val) => [`${val}DEG`, val])));
/**
 * @typedef {number} BondAngle
 * @typedef {number[]} MoleculeIndex
*/

/**
 * @readonly
 * @enum {string}
 */
export const MoleculePositioning = Object.freeze({
    DEFAULT: "default",
    CENTER_HORIZ_ROOT: "center_horiz_root",
    CENTER_HORIZ_MOLECULE: "center_horiz_molecule"
});

/**
 * @readonly
 * @enum {string}
 */
export const PartialCharge = Object.freeze({
    POSITIVE: "positive",
    NEGATIVE: "negative"
});

export class Molecule {
    /** @type {ChemElem} */
    root;

    /**
     * @param {ChemElem|string} baseElem
    */
    constructor(baseElem) {
        this.root = ChemElem.normalize(baseElem)
    }

    /**
     * Rotates all bonds inside the molecule around their root
     * @param {number} angle 
     */
    rotate(angle) {
        let stack = [];

        let currVal = this.root;
        while (currVal) {
            for (let bond of currVal.attachedBonds) {
                if (bond.attachedElem) {
                    stack.push(bond.attachedElem);
                }
                bond.angle = (bond.angle + angle + 3600) % 360;
            }

            currVal = stack.splice(0, 1)[0];
        }
    }

    /**
     * Indexes this molecule to return a specific element in it's tree
     * @param {MoleculeIndex} index 
     * @returns {ChemElem?}
     */
    index(index) {
        let current = this.root;
        for (let idx of index) {
            current = current.attachedBonds[idx]?.attachedElem;
            if (!current) {
                return null;
            }
        }
        return current;
    }

    /**
     * @param {MoleculeRenderer} renderer 
     * @returns {HTMLElement} Rendered HTML
     */
    render(renderer) {
        let molecule = document.createElement("div");
        molecule.classList.add("molecule");
        let rootElem = this.root.render(renderer);
        molecule.appendChild(rootElem);
        renderer.waiting_on_promises.push(waitForElm(`#${rootElem.id}`).then(() => {
            molecule.style.setProperty("--bond-attached-elem-width", `${rootElem.getElementsByClassName("elem-content")[0].getBoundingClientRect().width}px`);
            molecule.style.setProperty("--bond-attached-elem-height", `${rootElem.getElementsByClassName("elem-content")[0].getBoundingClientRect().height}px`);
            return renderer.updateMoleculeSize();
        }));
        return molecule;
    }

    /**
     * @returns {Object}
    */
    serialize() {
        return {
            root: this.root.serialize()
        };
    }

    /**
     * @param {Object} json 
     * @returns {Molecule}
     */
    static deserialize(json) {
        return new Molecule(ChemElem.deserialize(json["root"]));
    }

    /**
     * Returns a copy of this molecule.
     * @returns {Molecule}
     */
    clone() {
        return Molecule.deserialize(this.serialize());
    }
}

export class Bond {
    /** @type {BondType} */
    bondType;
    /** @type {BondAngle} */
    angle;
    /** @type {number} */
    length;
    /** @type {ChemElem | undefined} */
    attachedElem;

    /**
     * @param {BondType} bondType 
     * @param {BondAngle} angle 
     * @param {number} length 
     * @param {ChemElem} [attachedElem] 
     */
    constructor(bondType, angle, length, attachedElem) {
        this.bondType = bondType;
        this.angle = angle;
        this.length = length;
        this.attachedElem = attachedElem;
    }

    /**
     * @param {MoleculeRenderer} renderer 
     * @returns {HTMLElement} Rendered HTML
     */
    render(renderer) {
        let bond_elem = document.createElement("div");
        // bond_elem.classList.add("bond", this.bondType, `rot-${this.angle}`);
        bond_elem.classList.add("bond", this.bondType);
        bond_elem.style.setProperty("--bond-rot", `${this.angle}deg`);
        bond_elem.style.setProperty("--bond-width-mult", `${this.length}`);

        if (this.attachedElem) {
            let child = this.attachedElem.render(renderer);
            bond_elem.appendChild(child);
            if (this.attachedElem.name === "_") {
                bond_elem.style.setProperty("--bond-attached-elem-width", "12.16px");
                bond_elem.style.setProperty("--bond-attached-elem-height", "24px");
            } else {
                renderer.waiting_on_promises.push(waitForElm(`#${child.id}`).then(elem => {
                    bond_elem.style.setProperty("--bond-attached-elem-width", `${child.getElementsByClassName("elem-content")[0].getBoundingClientRect().width}px`);
                    bond_elem.style.setProperty("--bond-attached-elem-height", `${child.getElementsByClassName("elem-content")[0].getBoundingClientRect().height}px`);
                    return renderer.updateMoleculeSize();
                }));
            }
        } else {
            bond_elem.style.setProperty("--bond-attached-elem-width", "12.16px");
            bond_elem.style.setProperty("--bond-attached-elem-height", "24px");
        }

        return bond_elem;
    }

    /**
     * @returns {Object}
    */
    serialize() {
        return {
            bondType: this.bondType,
            bondAngle: this.angle,
            bondLength: this.length,
            attachedElement: this.attachedElem ? this.attachedElem.serialize() : null
        };
    }

    /**
     * @param {Object} json 
     * @returns {Bond}
     */
    static deserialize(json) {
        return new Bond(json["bondType"], json["bondAngle"], json["bondLength"], json["attachedElement"] ? ChemElem.deserialize(json["attachedElement"]) : undefined);
    }
}

const CHAR_TO_SUBSCRIPT = Object.freeze({
    "0": "₀",
    "1": "₁",
    "2": "₂",
    "3": "₃",
    "4": "₄",
    "5": "₅",
    "6": "₆",
    "7": "₇",
    "8": "₈",
    "9": "₉",
    "+": "₊",
    "-": "₋",
    "=": "₌",
    "(": "₍",
    ")": "₎",
    "a": "ₐ",
    "e": "ₑ",
    "h": "ₕ",
    "i": "ᵢ",
    "j": "ⱼ",
    "k": "ₖ",
    "l": "ₗ",
    "m": "ₘ",
    "n": "ₙ",
    "o": "ₒ",
    "p": "ₚ",
    "r": "ᵣ",
    "s": "ₛ",
    "t": "ₜ",
    "u": "ᵤ",
    "v": "ᵥ",
    "x": "ₓ"
});

const CHAR_TO_SUPERSCRIPT = Object.freeze({
    "0": "⁰",
    "1": "¹",
    "2": "²",
    "3": "³",
    "4": "⁴",
    "5": "⁵",
    "6": "⁶",
    "7": "⁷",
    "8": "⁸",
    "9": "⁹",
    "+": "⁺",
    "-": "⁻",
    "(": "⁽",
    ")": "⁾"
});

export class ChemElem {
    static PAT_SUBSCRIPT = /_(\d+|\{[^}]+\})/;
    static PAT_SUPERSCRIPT = /\^(\d?(\+|\-)|\{[^}]+\})/;
    static PAT_REGULAR_TEXT_1 = /([^<>\/]*)(<sub>[^<]*<\/sub>|<sup>[^<]<\/sup>)/g;
    static PAT_REGULAR_TEXT_2 = /([^<>\/]*)$/;

    /** @type {string} */
    name;
    /** @type {ElemAlign} */
    elemAlign = ElemAlign.LEFT;
    /** @type {?PartialCharge} */
    partialCharge = null;
    /** @type {Bond[]} */
    attachedBonds = [];
    /** @type {?ChemElem} */
    parentElem = null;

    /**
     * @param {string} name
     * @param {{partialCharge?: PartialCharge, attachedBonds?: Bond[], parentElem?: ChemElem, elemAlign?: ElemAlign}} [options]
     */
    constructor(name, options) {
        this.id = Math.floor(Math.random() * 999999);

        this.name = name;
        if (options) {
            if (options.partialCharge) {
                this.partialCharge = options.partialCharge;
            }
            if (options.parentElem) {
                this.parentElem = options.parentElem;
            }
            if (options.attachedBonds) {
                this.attachedBonds = options.attachedBonds;
            }
            if (options.elemAlign) {
                this.elemAlign = options.elemAlign;
            }
        }
    }
    
    /**
     * Takes in an `ChemElem` or a `string` and always returns an `ChemElem`
     * @param {ChemElem | string} value 
     */
    static normalize(value) {
        if (typeof value === "string") {
            return new ChemElem(value);
        } else if (value instanceof ChemElem) {
            return value;
        }
    }

    get parentBond() {
        if (this.parentElem) {
            for (let bond of this.parentElem.attachedBonds) {
                if (bond.attachedElem === this) {
                    return bond;
                }
            }
        }
        return null;
    }
    
    /**
     * The index of this element in it's molecule, if it is in one
     * @type {MoleculeIndex?}
     */
    get moleculeIndex() {
        let index = [];
        let current = this;
        while (current.parentElem) {
            for (let [i, bond] of current.parentElem.attachedBonds.entries()) {
                if (bond.attachedElem === current) {
                    index.push(i);
                    break;
                }
            }
            current = current.parentElem;
        }
        return index.reverse();
    }

    /**
     * Attaches a new element to this one, returning the produced bond object
     * @param {BondType} bondType 
     * @param {BondAngle} bondAngle 
     * @param {number} bondLength
     * @param {ChemElem | string} [element] 
     * @returns {Bond}
     */
    attachElement(bondType, bondAngle, bondLength, element) {
        let elem = element ? ChemElem.normalize(element) : undefined;
        if (elem) {
            elem.parentElem = this;
        }
        let b = new Bond(bondType, bondAngle, bondLength, elem);
        this.attachedBonds.push(b);
        return b;
    }

    /**
     * Unattaches this `ChemElem` from it's parent, if it has one
     */
    unattachSelf() {
        if (!this.parentElem) { return; }

        for (let [i, bond] of this.parentElem.attachedBonds.entries()) {
            if (bond.attachedElem === this) {
                this.parentElem.attachedBonds[i] = this.parentElem.attachedBonds[this.parentElem.attachedBonds.length - 1];
                this.parentElem.attachedBonds.pop();
                this.parentElem = null;
                break;
            }
        }
    }

    /** @type {string} */
    get nameAsHTML() {
        let converted_name = new String(this.name);
        let match = converted_name.match(ChemElem.PAT_SUBSCRIPT);
        while (match) {
            converted_name = converted_name.replace(match[0], `<sub>${match[1].replaceAll(/[{}]/g, "")}</sub>`);
            match = converted_name.match(ChemElem.PAT_SUBSCRIPT);
        }
        match = converted_name.match(ChemElem.PAT_SUPERSCRIPT);
        while (match) {
            converted_name = converted_name.replace(match[0], `<sup>${match[1].replaceAll(/[{}]/g, "")}</sup>`);
            match = converted_name.match(ChemElem.PAT_SUPERSCRIPT);
        }
        for (let match of converted_name.matchAll(ChemElem.PAT_REGULAR_TEXT_1)) {
            let spanned = "";
            for (let i=0; i<match[1].length - 1; i++) {
                spanned += `<span>${match[1].charAt(i)}</span>`;
            }
            spanned += `<span>${match[1].charAt(match[1].length - 1)}${match[2]}</span>`;
            converted_name = converted_name.replace(match[0], spanned);
        }
        match = converted_name.match(ChemElem.PAT_REGULAR_TEXT_2);
        if (match) {
            let spanned = "";
            for (let i=0; i<match[1].length; i++) {
                spanned += `<span>${match[1].charAt(i)}</span>`;
            }
            converted_name = converted_name.replace(match[1], spanned);
        }
        return converted_name;
    }

    /** @type {string} */
    get nameAsAttr() {
        let converted_name = new String(this.name);
        let match = converted_name.match(ChemElem.PAT_SUBSCRIPT);
        while (match) {
            converted_name = converted_name.replace(match[0], match[1].replaceAll(/[{}]/g, "").replaceAll(/./g, v => CHAR_TO_SUBSCRIPT[v] ?? "_"));
            match = converted_name.match(ChemElem.PAT_SUBSCRIPT);
        }
        match = converted_name.match(ChemElem.PAT_SUPERSCRIPT);
        while (match) {
            converted_name = converted_name.replace(match[0], match[1].replaceAll(/[{}]/g, "").replaceAll(/./g, v => CHAR_TO_SUPERSCRIPT[v] ?? "_"));
            match = converted_name.match(ChemElem.PAT_SUPERSCRIPT);
        }
        return converted_name;
    }

    /**
     * @param {MoleculeRenderer} renderer 
     * @returns {HTMLElement} Rendered HTML
     */
    render(renderer) {
        let elem = createSimpleElement("div", [], {
            id: `elem-${this.id}`,
            classes: ["element"]
        });
        let bond_content = createSimpleElement("span", [], {
            classes: ["elem-content"],
            attrs: { "data-elem-align": this.elemAlign }
        });
        if (this.name === "_") { bond_content.classList.add("elem-empty"); }
        let bond_content_anchor = document.createElement("button");
        bond_content_anchor.innerHTML = this.name === "_" ? "" : this.nameAsHTML;
        bond_content_anchor.setAttribute("data-content-html", this.nameAsAttr);
        if (renderer.isMainRenderer) {
            bond_content_anchor.onclick = globalThis.inspectChemElem.bind(undefined, this);
        }
        bond_content.appendChild(bond_content_anchor);
        elem.appendChild(bond_content);
        if (this.partialCharge) {
            let bond_charge = document.createElement("span");
            let position = "pos_top"; // TODO
            bond_charge.classList.add("partial-charge", position, this.partialCharge);
            elem.appendChild(bond_charge);
        }
        
        for (let bond of this.attachedBonds) {
            let bondHtml = bond.render(renderer);
            waitForElm(`#${elem.id}`).then(elem => {
                let rect = elem.getBoundingClientRect();
                bondHtml.style.setProperty("--bond-parent-elem-width", `${rect.width}px`);
                bondHtml.style.setProperty("--bond-parent-elem-height", `${rect.height}px`);
            });
            elem.appendChild(bondHtml);
        }

        return elem;
    }

    /**
     * @returns {Object}
    */
    serialize() {
        return {
            name: this.name,
            align: this.elemAlign,
            partialCharge: this.partialCharge,
            charge: this.charge,
            attachedBonds: this.attachedBonds.map(b => b.serialize())
        };
    }

    /**
     * @param {{name: string, partialCharge: string?, charge: number, attachedBonds: Object[]}} json 
     * @returns {ChemElem}
     */
    static deserialize(json) {
        let bonds = json["attachedBonds"].map(obj => Bond.deserialize(obj));
        let elem = new ChemElem(json["name"], {
            partialCharge: json["partialCharge"],
            charge: json["charge"],
            attachedBonds: bonds,
            elemAlign: json["align"]
        });
        for (let bond of bonds) {
            if (bond.attachedElem) {
                bond.attachedElem.parentElem = elem;
            }
        }
        return elem;
    }
}

export class MoleculeBuilderPart {
    /** @type {ChemElem} */
    c;

    /**
     * @param {ChemElem} current 
     */
    constructor(current) {
        this.c = current;
    }

    /** @type {ChemElem} */
    get current() {
        return this.c;
    }

    /**
     * @param {BondType} bondType 
     * @param {BondAngle} bondAngle 
     * @param {number} bondLength
     * @param {ChemElem | string} [element] 
     * @returns {?MoleculeBuilderPart}
     */
    attachElement(bondType, bondAngle, bondLength, element) {
        let elem = element ? ChemElem.normalize(element) : undefined;
        this.current.attachElement(bondType, bondAngle, bondLength, elem);
        if (elem) {
            return new MoleculeBuilderPart(elem);
        }
    }

    /**
     * @param {BondAngle} bondAngle 
     * @param {number} bondLength
     * @param {ChemElem | string} [element]
     * @returns {MoleculeBuilderPart} 
     */
    singleBond(bondAngle, bondLength, element) {
        return this.attachElement(BondType.SINGLE, bondAngle, bondLength, element);
    }

    /**
     * @param {BondAngle} bondAngle 
     * @param {number} bondLength
     * @param {ChemElem | string} [element]
     * @returns {MoleculeBuilderPart} 
     */
    doubleBond(bondAngle, bondLength, element) {
        return this.attachElement(BondType.DOUBLE, bondAngle, bondLength, element);
    }

    /**
     * @param {BondAngle} bondAngle 
     * @param {number} bondLength
     * @param {ChemElem | string} [element]
     * @returns {MoleculeBuilderPart} 
     */
    tripleBond(bondAngle, bondLength, element) {
        return this.attachElement(BondType.TRIPLE, bondAngle, bondLength, element);
    }

    /**
     * @returns {ChemElem}
     */
    buildElement() {
        return this.current;
    }
}

export class MoleculeBuilder extends MoleculeBuilderPart {
    /** @type {Molecule} */
    inner;
    
    constructor(baseElem) {
        super();
        this.inner = new Molecule(baseElem);
    }

    /** @type {ChemElem} */
    get current() {
        return this.inner.root;
    }

    /**
     * @returns {Molecule}
     */
    build() {
        return this.inner;
    }
}

export class MoleculeRenderer {
    /** @type {HTMLElement} */
    html_element;

    /** @type {{x: number, y: number}} */
    #mol_offset = { x: 0, y: 0 };
    
    /** @type {{x: number, y: number}} */
    #internal_mol_offset = { x: 0, y: 0 };

    /** @type {Promise<MoleculeMetrics?>[]} */
    waiting_on_promises = [];

    /** @type {boolean} */
    isMainRenderer;

    /** @type {MoleculePositioning} */
    positioning;
    
    /**
     * @param {HTMLElement} [wrap_elem] 
     * @param {boolean} [isMainRenderer] 
     * @param {MoleculePositioning} [positioning] 
     */
    constructor(wrap_elem, isMainRenderer, positioning) {
        this.html_element = (wrap_elem !== undefined) ? wrap_elem : document.createElement("div");
        this.html_element.classList.add("mol-container");
        this.html_element.style.setProperty("--molecule-offset-x", "0px");
        this.html_element.style.setProperty("--molecule-offset-y", "0px");
        this.isMainRenderer = isMainRenderer ?? false;
        this.positioning = positioning ?? MoleculePositioning.DEFAULT;
    }

    /** @type {number} */
    get molecule_offset_x() {
        return this.#mol_offset.x;
    }

    /** @type {number} */
    get molecule_offset_y() {
        return this.#mol_offset.y;
    }
    
    /** @type {number} */
    set molecule_offset_x(value) {
        this.#mol_offset.x = value;
        this.html_element.style.setProperty("--molecule-offset-x", `${this.#mol_offset.x + this.#internal_mol_offset.x}px`);
    }
    
    /** @type {number} */
    set molecule_offset_y(value) {
        this.#mol_offset.y = value;
        this.html_element.style.setProperty("--molecule-offset-y", `${this.#mol_offset.y + this.#internal_mol_offset.y}px`);
    }

    /**
     * Renders the given molecule into the HTML element wrapped by this
     * renderer.
     * 
     * When given nothing as a parameter, clears the HTML element of any
     * previously rendered molecule.
     * 
     * @param {Molecule} [molecule]
     * @return {Promise<MoleculeMetrics?>?} Resolves after final sizing updates
     */
    render(molecule) {
        for (let child of this.html_element.children) {
            this.html_element.removeChild(child);
        }
        if (molecule !== undefined) {
            this.html_element.appendChild(molecule.render(this));
            return Promise.all(this.waiting_on_promises).then(_ => {
                return this.html_element.children.length > 0 ? getMoleculeSize(this.html_element.children[0]) : {width: 0, height: 0};
            });
        }
        return null;
    }

    /**
     * @returns {MoleculeMetrics?}
     */
    updateMoleculeSize() {
        if (this.html_element.children.length > 0) {
            let metrics = getMoleculeSize(this.html_element.children[0]);
            this.html_element.style.setProperty("--molecule-min-x", `${metrics.minX}px`);
            this.html_element.style.setProperty("--molecule-min-y", `${metrics.minY}px`);
            this.html_element.style.setProperty("--molecule-max-x", `${metrics.maxX}px`);
            this.html_element.style.setProperty("--molecule-max-y", `${metrics.maxY}px`);
            if (this.positioning != MoleculePositioning.CENTER_HORIZ_ROOT) {
                this.html_element.style.setProperty("--molecule-initial-x", `${metrics.initialX}px`);
                this.html_element.style.setProperty("--molecule-initial-y", `${metrics.initialY}px`);
            } else {
                // If we want to center horizontally, we for some reason need
                // to explicitly NOT set molecule-inital-x. Even though I wrote
                // the positioning logic for the molecules, I have no idea why
                // it only works in this specific way.
                this.html_element.style.setProperty("--molecule-initial-y", `${metrics.initialY}px`);
            }
            this.html_element.style.setProperty("--molecule-width", `${metrics.width}px`);
            this.html_element.style.setProperty("--molecule-height", `${metrics.height}px`);

            if (this.positioning == MoleculePositioning.CENTER_HORIZ_MOLECULE) {
                this.#internal_mol_offset = { x: -0.5 * metrics.width, y: 0 };
                this.html_element.style.setProperty("--molecule-offset-x", `${this.#mol_offset.x + this.#internal_mol_offset.x}px`);
                this.html_element.style.setProperty("--molecule-offset-y", `${this.#mol_offset.y + this.#internal_mol_offset.y}px`);
            }
            return metrics;
        } else {
            this.html_element.style.setProperty("--molecule-min-x", '0px');
            this.html_element.style.setProperty("--molecule-min-y", '0px');
            this.html_element.style.setProperty("--molecule-max-x", '0px');
            this.html_element.style.setProperty("--molecule-max-y", '0px');
            this.html_element.style.setProperty("--molecule-initial-x", '0px');
            this.html_element.style.setProperty("--molecule-initial-y", '0px');
            this.html_element.style.setProperty("--molecule-width", '1px');
            this.html_element.style.setProperty("--molecule-height", '1px');
            if (this.positioning == MoleculePositioning.CENTER_HORIZ_MOLECULE) {
                this.#internal_mol_offset = { x: 0, y: 0 };
            }
            return null;
        }
    }
}

/**
 * @typedef {Object} MoleculeMetrics
 * @property {number} minX Smallest screen X coordinate of the molecule
 * @property {number} maxX Biggest screen X coordinate of the molecule
 * @property {number} minY Smallest screen Y coordinate of the molecule
 * @property {number} maxY Biggest screen Y coordinate of the molecule
 * @property {number} width
 * @property {number} height
 * @property {number} initialX Screen X coordinate of the root element
 * @property {number} initialY Screen Y coordinate of the root element
 */

/**
 * @param {HTMLDivElement} mol_html 
 * @returns {MoleculeMetrics}
 */
export function getMoleculeSize(mol_html) {
    let min_x = 10000;
    let max_x = 0;
    let min_y = 10000;
    let max_y = 0;

    /**
     * @param {HTMLElement} curr_node 
     */
    function minmax(curr_node) {
        if (!curr_node) { return; }

        let rect = curr_node.getBoundingClientRect();
        // console.log(curr_node, rect);
        min_x = Math.min(min_x, rect.left, rect.right);
        max_x = Math.max(max_x, rect.left, rect.right);
        min_y = Math.min(min_y, rect.top, rect.bottom);
        max_y = Math.max(max_y, rect.top, rect.bottom);

        // for (let i = 0; i < curr_node.children.length; i++) {
        //     let child = curr_node.children[i];
        //     if (child.classList.contains("bond")) {
        //         minmax(child.children[0]);
        //     }
        // }
        for (let child of curr_node.children) {
            minmax(child);
        }
    }

    minmax(mol_html.children[0]);

    let initialRect = mol_html.children[0].getBoundingClientRect();

    return {
        minX: min_x,
        minY: min_y,
        maxX: max_x,
        maxY: max_y,
        width: max_x - min_x,
        height: max_y - min_y,
        initialX: initialRect.left,
        initialY: initialRect.top,
    };
}