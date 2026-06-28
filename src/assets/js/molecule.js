/**
 * @readonly
 * @enum {string}
 */
export const BondType = Object.freeze({
    SINGLE: "single",
    DOUBLE: "double",
    TRIPLE: "triple"
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
*/

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

    render() {
        let molecule = document.createElement("div");
        molecule.classList.add("molecule");
        molecule.appendChild(this.root.render());
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
     * @returns {HTMLElement}
     */
    render() {
        let bond_elem = document.createElement("div");
        // bond_elem.classList.add("bond", this.bondType, `rot-${this.angle}`);
        bond_elem.classList.add("bond", this.bondType);
        bond_elem.style.setProperty("--bond-rot", `${this.angle}deg`);
        bond_elem.style.setProperty("--bond-width-mult", `${this.length}`);

        if (this.attachedElem) {
            let child = this.attachedElem.render();
            bond_elem.appendChild(child);
            if (this.attachedElem.name === "_") {
                bond_elem.style.setProperty("--bond-attached-elem-width", "12.16px");
                bond_elem.style.setProperty("--bond-attached-elem-height", "24px");
            } else {
                waitForElm(`#${child.id}`).then(elem => {
                    bond_elem.style.setProperty("--bond-attached-elem-width", `${child.getElementsByClassName("elem-content")[0].getBoundingClientRect().width}px`);
                    bond_elem.style.setProperty("--bond-attached-elem-height", `${child.getElementsByClassName("elem-content")[0].getBoundingClientRect().height}px`);
                    updateMoleculeSize();
                });
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

export class ChemElem {
    static PAT_SUBSCRIPT = /_(\d+|\{[^}]+\})/;
    static PAT_SUPERSCRIPT = /\^(\d?(\+|\-)|\{[^}]+\})/;

    /** @type {string} */
    name;
    /** @type {?PartialCharge} */
    partialCharge = null;
    /** @type {number} */
    charge = 0;
    /** @type {Bond[]} */
    attachedBonds = [];
    /** @type {?ChemElem} */
    parentElem = null;

    /**
     * @param {string} name
     * @param {{partialCharge?: PartialCharge, charge?: number, attachedBonds?: Bond[], parentElem?: ChemElem}} [options]
     */
    constructor(name, options) {
        this.id = Math.floor(Math.random() * 999999);

        this.name = name;
        if (options) {
            if (options.partialCharge) {
                this.partialCharge = options.partialCharge;
            }
            if (options.charge) {
                this.charge = options.charge;
            }
            if (options.parentElem) {
                this.parentElem = options.parentElem;
            }
            if (options.attachedBonds) {
                this.attachedBonds = options.attachedBonds;
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
     * Attaches a new element to this one
     * @param {BondType} bondType 
     * @param {BondAngle} bondAngle 
     * @param {number} bondLength
     * @param {ChemElem | string} [element] 
     */
    attachElement(bondType, bondAngle, bondLength, element) {
        let elem = element ? ChemElem.normalize(element) : undefined;
        if (elem) {
            elem.parentElem = this;
        }
        this.attachedBonds.push(new Bond(bondType, bondAngle, bondLength, elem));
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
        return converted_name;
    }

    /**
     * @returns {HTMLElement}
     */
    render() {
        let elem = document.createElement("div");
        elem.classList.add("element");
        elem.id = `elem-${this.id}`;
        let bond_content = document.createElement("span");
        bond_content.classList.add("elem-content");
        let bond_content_anchor = document.createElement("button");
        bond_content_anchor.innerHTML = this.name === "_" ? "" : this.nameAsHTML;
        bond_content_anchor.onclick = globalThis.inspectChemElem.bind(undefined, this);
        bond_content.appendChild(bond_content_anchor);
        elem.appendChild(bond_content);
        if (this.charge != 0) {
            let bond_charge = document.createElement("span");
            bond_charge.classList.add("elem-charge");
            bond_charge.innerText = `${Math.abs(this.charge)}${Math.sign(this.charge) > 0 ? '+' : '-'}`;
            elem.appendChild(bond_charge);
        }
        if (this.partialCharge) {
            let bond_charge = document.createElement("span");
            let position = "pos_top"; // TODO
            bond_charge.classList.add("partial-charge", position, this.partialCharge);
            elem.appendChild(bond_charge);
        }
        for (let bond of this.attachedBonds) {
            elem.appendChild(bond.render());
        }

        return elem;
    }

    /**
     * @returns {Object}
    */
    serialize() {
        return {
            name: this.name,
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
            attachedBonds: bonds
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

export function mainRender(molecule) {
    if (!molecule) { return; }
    let content = document.getElementById("main_container");
    for (let child of content.children) {
        content.removeChild(child);
    }
    content.appendChild(molecule.render());
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
        console.log(curr_node, rect);
        min_x = Math.min(min_x, rect.left, rect.right);
        max_x = Math.max(max_x, rect.left, rect.right);
        min_y = Math.min(min_y, rect.top, rect.bottom);
        max_y = Math.max(max_y, rect.top, rect.bottom);

        for (let i = 0; i < curr_node.children.length; i++) {
            let child = curr_node.children[i];
            if (child.classList.contains("bond")) {
                minmax(child.children[0]);
            }
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

export function updateMoleculeSize() {
    let container = document.getElementById("main_container");
    let metrics = getMoleculeSize(container.children[0]);
    console.log("Molecule Metrics:", metrics);
    container.style.setProperty("--molecule-min-x", `${metrics.minX}px`);
    container.style.setProperty("--molecule-min-y", `${metrics.minY}px`);
    container.style.setProperty("--molecule-max-x", `${metrics.maxX}px`);
    container.style.setProperty("--molecule-max-y", `${metrics.maxY}px`);
    container.style.setProperty("--molecule-initial-x", `${metrics.initialX}px`);
    container.style.setProperty("--molecule-initial-y", `${metrics.initialY}px`);
    container.style.setProperty("--molecule-width", `${metrics.width}px`);
    container.style.setProperty("--molecule-height", `${metrics.height}px`);
}