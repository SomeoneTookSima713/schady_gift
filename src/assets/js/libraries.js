import { BondType, ChemElem, Molecule, MoleculeRenderer } from "./molecule.js";

const invoke = window.__TAURI__.core.invoke;

export class MoleculeLibrary {
    /** @type {string} */
    id;

    /** @type {{name: string, molecule: Molecule}[]} */
    molecules;

    /**
     * @param {string} id 
     * @param {{name: string, molecule: Molecule}[]} molecules 
     */
    constructor(id, molecules) {
        this.id = id;
        this.molecules = molecules;
    }

    /**
     * Loads the given library from disk
     * @param {string} id 
     * @returns {Promise<MoleculeLibrary>}
     */
    static async load(id) {
        /** @type {{id: string, entries: {name: string, molecule_contents: Object}[]}} */
        let loaded_data = await invoke("load_library", { id });

        return new MoleculeLibrary(id, loaded_data.entries.map(({name, molecule_contents}) => {return {name, molecule: Molecule.deserialize(molecule_contents)}}));
    }
}

export class SelectableMoleculeHTML {
    /** @type {HTMLButtonElement} */
    baseHtml;

    /** @type {HTMLElement} */
    renderArea;

    /** @type {HTMLElement} */
    moleculeName;

    /**
     * @param {HTMLButtonElement} baseHtml 
     */
    constructor(baseHtml) {
        this.baseHtml = baseHtml;
        this.renderArea = baseHtml.querySelector(".card-img-top");
        this.moleculeName = baseHtml.querySelector(".card-body");
    }

    /** @returns {SelectableMoleculeHTML} */
    clone() {
        return new SelectableMoleculeHTML(this.baseHtml.cloneNode(true));
    }
}

export class MoleculeLibrarySelectorHTML {
    /** @type {HTMLElement} */
    baseHtml;

    /** @type {HTMLInputElement} */
    searchInput;

    /** @type {HTMLSelectElement} */
    sortSelect;

    /** @type {HTMLButtonElement} */
    closeBtn;

    /** @type {HTMLElement} */
    libraryContents;

    /** @type {SelectableMoleculeHTML} */
    selectableMoleculeBase;

    /**
     * @param {HTMLElement} baseHtml 
     */
    constructor(baseHtml) {
        this.baseHtml = baseHtml;
        this.searchInput = baseHtml.querySelector(".molecule-library-search");
        this.sortSelect = baseHtml.querySelector(".molecule-library-sort");
        this.closeBtn = baseHtml.querySelector(".btn-close");
        this.libraryContents = baseHtml.querySelector(".molecule-library-contents");
        this.selectableMoleculeBase = new SelectableMoleculeHTML(baseHtml.querySelector(".selectable"));
    }

    /** @returns {MoleculeLibrarySelectorHTML} */
    clone() {
        let clone = new MoleculeLibrarySelectorHTML(this.baseHtml.cloneNode(true));
        clone.selectableMoleculeBase = this.selectableMoleculeBase;
        return clone;
    }
}

export class MoleculeLibrarySelector {
    /** @type {MoleculeLibrary} */
    library;

    /** @type {MoleculeLibrarySelectorHTML} */
    htmlBase;

    /** @type {{pre: (molecule: Molecule) => any, post: (molecule: Molecule) => any}?} */
    moleculeRenderModifier = null;

    /**
     * @param {MoleculeLibrary} library 
     * @param {MoleculeLibrarySelectorHTML} htmlBase 
     * @param {{moleculeRenderModifier?: {pre: (molecule: Molecule) => any, post: (molecule: Molecule) => any}}} [options] 
     */
    constructor(library, htmlBase, options) {
        this.library = library;
        this.htmlBase = htmlBase;
        if (options) {
            this.moleculeRenderModifier = options.moleculeRenderModifier ?? null;
        }
    }

    /**
     * @param {string} search 
     * @param {"az"|"za"} sort
     * @returns {{name: string, molecule: Molecule}[]}
     */
    #getLibraryEntries(search, sort) {
        let searched = this.library.molecules.filter(val => val.name.includes(search));
        switch (sort) {
            case "az":
                searched.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case "za":
                searched.sort((a, b) => -a.name.localeCompare(b.name));
                break;
        }

        return searched;
    }

    /**
     * @param {(molecule: Molecule) => any} onMoleculeSelected 
     */
    open(onMoleculeSelected) {
        let html = this.htmlBase.clone();
        let modal;

        console.log(this.htmlBase);
        console.log(html);
        html.libraryContents.replaceChildren();
        for (let {name, molecule} of this.#getLibraryEntries(html.searchInput.value, html.sortSelect.value)) {
            let selectable = html.selectableMoleculeBase.clone();
            selectable.moleculeName.innerHTML = (new ChemElem(name)).nameAsHTML;
            let moleculeRenderer = new MoleculeRenderer(selectable.renderArea, false, "center_horiz_root");
            html.baseHtml.addEventListener("shown.bs.modal", () => {
                if (this.moleculeRenderModifier) {
                    this.moleculeRenderModifier.pre(molecule);
                    moleculeRenderer.render(molecule);
                    this.moleculeRenderModifier.post(molecule);
                } else {
                    moleculeRenderer.render(molecule);
                }
                moleculeRenderer.updateMoleculeSize();
            });
            selectable.baseHtml.onclick = () => {
                onMoleculeSelected(molecule)
                modal.hide();
            };
            html.libraryContents.appendChild(selectable.baseHtml);
        }
        
        document.body.appendChild(html.baseHtml);
        html.baseHtml.id = `library-selector-${Math.random().toString(36).slice(2, 7)}`;
        html.baseHtml.addEventListener("hidden.bs.modal", () => { document.body.removeChild(html.baseHtml); });
        modal = bootstrap.Modal.getOrCreateInstance(`#${html.baseHtml.id}`);
        modal.show();
    }
}

export const LIBRARY_SELECTOR_OPTIONS_PRESETS = Object.freeze({
    BOND_SELECTOR: {
        moleculeRenderModifier: {
            pre: (/** @type {Molecule} */ mol) => {
                mol.root.attachElement(BondType.DOTTED, 180, 1, new ChemElem("_"));
            },
            post: (/** @type {Molecule} */ mol) => {
                mol.root.attachedBonds[mol.root.attachedBonds.length-1].attachedElem.unattachSelf();
            }
        }
    }
});

export const LIBRARY_SELECTOR_HTML = new MoleculeLibrarySelectorHTML(document.querySelector("#molecule-library-base"));
document.body.removeChild(document.querySelector("#molecule-library-base"));