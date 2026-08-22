import { createSimpleElement } from "./html_helper.js";
import { BondType, ChemElem, Molecule, MoleculeRenderer } from "./molecule.js";
import { Translations } from "./translations.js";

const invoke = window.__TAURI__.core.invoke;

export class MoleculeLibrary {
    /** @type {string} */
    id;

    /** @type {{name: string, category?: string, auto_select?: number[], molecule: Molecule}[]} */
    molecules;

    /**
     * @param {string} id 
     * @param {{name: string, category?: string, auto_select?: number[], molecule: Molecule}[]} molecules 
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
        /** @type {{id: string, entries: {name: string, category?: string, auto_select?: number[], molecule_contents: Object}[]}} */
        let loaded_data = await invoke("load_library", { id });

        return new MoleculeLibrary(id, loaded_data.entries.map(({name, category, auto_select, molecule_contents}) => {return {name, category, auto_select, molecule: Molecule.deserialize(molecule_contents)}}));
    }
}

export class SelectableMoleculeHTML {
    /** @type {HTMLButtonElement} */
    baseHtml;

    /** @type {HTMLElement} */
    renderArea;

    /** @type {HTMLElement} */
    moleculeName;

    /** @type {HTMLElement} */
    category;

    /**
     * @param {HTMLButtonElement} baseHtml 
     */
    constructor(baseHtml) {
        this.baseHtml = baseHtml;
        this.renderArea = baseHtml.querySelector(".card-img-top");
        this.moleculeName = baseHtml.querySelector(".card-body");
        this.category = baseHtml.querySelector(".selectable-category");
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

/**
 * @typedef {Object} LibrarySelectorOptions
 * @property {{pre: (mol: Molecule) => any, post: (mol: Molecule) => any}} [moleculeRenderModifier]
 * @property {"default"|"center_horiz_root"} [moleculePositioningValue] Default is `"center_horiz_root"`
 */

/** @type {MoleculeLibrarySelector?} */
let currentlyOpenedLibrarySelector = null;

/** @returns {boolean} */
export function isLibrarySelectorOpen() {
    return currentlyOpenedLibrarySelector !== null;
}

export class MoleculeLibrarySelector {
    /** @type {MoleculeLibrary} */
    library;

    /** @type {MoleculeLibrarySelectorHTML} */
    htmlBase;

    /** @type {HTMLElement?} */
    currentHtmlElement = null;

    /** @type {LibrarySelectorOptions?} */
    options = null;

    /**
     * @param {MoleculeLibrary} library 
     * @param {MoleculeLibrarySelectorHTML} htmlBase 
     * @param {LibrarySelectorOptions} [options] 
     */
    constructor(library, htmlBase, options) {
        this.library = library;
        this.htmlBase = htmlBase;
        this.options = options ?? null;
    }

    /**
     * @param {string} search 
     * @param {"az"|"za"|"category_az"|"category_za"} sort
     * @returns {{name: string, category?: string, auto_select?: number[], molecule: Molecule}[]}
     */
    #getLibraryEntries(search, sort) {
        /** @type {[string, string, string?, string?]} */
        let [_1, nameSearch, _2, categorySearch] = search.match(/([^#]*)(#([^#]+)*)?/);
        nameSearch = nameSearch.trim();
        categorySearch = categorySearch?.trim() ?? undefined;
        let searched = this.library.molecules;
        if (nameSearch.length > 0) {
            searched = searched.filter(val => val.name.toLocaleLowerCase().includes(nameSearch.toLocaleLowerCase()));
        }
        if (categorySearch && categorySearch.length > 0) {
            searched = searched.filter(val => {
                let categoryString = (val.category ? Translations.LIBRARY_CATEGORIES[val.category] : undefined) ?? Translations.LIBRARY_CATEGORIES.CATEGORY_MISSING;
                return categoryString.toLocaleLowerCase().includes(categorySearch.toLocaleLowerCase());
            });
        }
        switch (sort) {
            case "az":
                searched.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case "za":
                searched.sort((a, b) => -a.name.localeCompare(b.name));
                break;
            case "category_az":
                searched.sort((a, b) => (a.category ?? "ZZZ_NONE").localeCompare(b.category ?? "ZZZ_NONE"));
                break;
            case "category_za":
                searched.sort((a, b) => -(a.category ?? "ZZZ_NONE").localeCompare(b.category ?? "ZZZ_NONE"));
                break;
        }

        return searched;
    }

    /**
     * @param {MoleculeLibrarySelectorHTML} html 
     * @param {(molecule: Molecule) => any} onMoleculeSelected 
     */
    #redoLibraryEntries(html, modal, onMoleculeSelected) {
        html.libraryContents.replaceChildren();

        let lastCategory = Translations.LIBRARY_CATEGORIES.CATEGORY_MISSING
        for (let {name, category, auto_select, molecule} of this.#getLibraryEntries(html.searchInput.value, html.sortSelect.value)) {
            let categoryString = (category ? Translations.LIBRARY_CATEGORIES[category] : undefined) ?? Translations.LIBRARY_CATEGORIES.CATEGORY_MISSING;
            if (lastCategory !== category && html.sortSelect.value.startsWith("category_")) {
                html.libraryContents.appendChild(createSimpleElement("h3", categoryString, { classes: ["category-title"] }))
            }
            lastCategory = category;

            let selectable = html.selectableMoleculeBase.clone();

            selectable.moleculeName.innerHTML = (new ChemElem(name)).nameAsHTML;
            selectable.category.innerText = categoryString;

            let moleculeRenderer = new MoleculeRenderer(selectable.renderArea, false, this.options?.moleculePositioningValue ?? "center_horiz_root");

            /** @type {Promise<import("./molecule.js").MoleculeMetrics?>} */
            let metricsPromise;
            if (this.options?.moleculeRenderModifier) {
                this.options.moleculeRenderModifier.pre(molecule);
                metricsPromise = moleculeRenderer.render(molecule);
                this.options.moleculeRenderModifier.post(molecule);
            } else {
                metricsPromise = moleculeRenderer.render(molecule);
            }
            moleculeRenderer.updateMoleculeSize();
            metricsPromise.then(metrics => {
                let renderAreaRect = selectable.renderArea.getBoundingClientRect();
                if (metrics === null) { return; }
                let scaleFacX = renderAreaRect.width / metrics.width * 0.95;
                let scaleFacY = renderAreaRect.height / metrics.height * 0.95;
                let scale = Math.min(scaleFacX, scaleFacY, 1.0);
                selectable.renderArea.children[0].style.scale = scale.toString();
                selectable.renderArea.children[0].style.height = `${metrics.height * scale}px`;
            });
            
            selectable.baseHtml.onclick = () => {
                onMoleculeSelected(molecule);
                modal.hide();
            };
            html.libraryContents.appendChild(selectable.baseHtml);
        }
    }

    /**
     * Closes any already opened libraries and opens this one.
     * @param {(molecule: Molecule) => any} onMoleculeSelected Gets called once a molecule gets selected
     */
    async open(onMoleculeSelected) {
        if (currentlyOpenedLibrarySelector !== null) {
            bootstrap.Modal.getOrCreateInstance(currentlyOpenedLibrarySelector.currentHtmlElement).hide();
            await (new Promise(resolve => addEventListener("hidden.bs.modal", () => resolve())));
        }
        let html = this.htmlBase.clone();
        let modal;

        html.searchInput.oninput = () => this.#redoLibraryEntries(html, modal, onMoleculeSelected);
        html.sortSelect.onchange = () => this.#redoLibraryEntries(html, modal, onMoleculeSelected);

        html.libraryContents.replaceChildren();

        let last_category = Translations.LIBRARY_CATEGORIES.CATEGORY_MISSING
        for (let {name, category, auto_select, molecule} of this.#getLibraryEntries(html.searchInput.value, html.sortSelect.value)) {
            let category_string = (category ? Translations.LIBRARY_CATEGORIES[category] : undefined) ?? Translations.LIBRARY_CATEGORIES.CATEGORY_MISSING;
            if (last_category !== category && html.sortSelect.value.startsWith("category_")) {
                html.libraryContents.appendChild(createSimpleElement("h3", category_string, { classes: ["category-title"] }))
            }
            last_category = category;

            let selectable = html.selectableMoleculeBase.clone();

            selectable.moleculeName.innerHTML = (new ChemElem(name)).nameAsHTML;
            selectable.category.innerText = category_string;

            let moleculeRenderer = new MoleculeRenderer(selectable.renderArea, false, this.options?.moleculePositioningValue ?? "center_horiz_root");
            html.baseHtml.addEventListener("shown.bs.modal", () => {
                /** @type {Promise<import("./molecule.js").MoleculeMetrics?>} */
                let metricsPromise;
                if (this.options?.moleculeRenderModifier) {
                    this.options.moleculeRenderModifier.pre(molecule);
                    metricsPromise = moleculeRenderer.render(molecule);
                    this.options.moleculeRenderModifier.post(molecule);
                } else {
                    metricsPromise = moleculeRenderer.render(molecule);
                }
                moleculeRenderer.updateMoleculeSize();
                metricsPromise.then(metrics => {
                    let renderAreaRect = selectable.renderArea.getBoundingClientRect();
                    if (metrics === null) { return; }
                    let scaleFacX = renderAreaRect.width / metrics.width * 0.95;
                    let scaleFacY = renderAreaRect.height / metrics.height * 0.95;
                    let scale = Math.min(scaleFacX, scaleFacY, 1.0);
                    selectable.renderArea.children[0].style.scale = scale.toString();
                    selectable.renderArea.children[0].style.height = `${metrics.height * scale}px`;
                });
            });
            selectable.baseHtml.onclick = () => {
                onMoleculeSelected(molecule);
                modal.hide();
            };
            html.libraryContents.appendChild(selectable.baseHtml);
        }
        
        document.body.appendChild(html.baseHtml);
        this.currentHtmlElement = html.baseHtml;
        html.baseHtml.id = `library-selector-${Math.random().toString(36).slice(2, 7)}`;
        let t = this;
        html.baseHtml.addEventListener("hidden.bs.modal", () => {
            document.body.removeChild(html.baseHtml);
            if (currentlyOpenedLibrarySelector === t) {
                currentlyOpenedLibrarySelector = null;
            }
        });
        modal = bootstrap.Modal.getOrCreateInstance(`#${html.baseHtml.id}`);
        modal.show();
        currentlyOpenedLibrarySelector = this;
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