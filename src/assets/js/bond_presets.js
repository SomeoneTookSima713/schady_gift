import { ChemElem, MoleculeBuilderPart } from "./molecule.js";

/** @type {Map<string, (angle: number, length: number) => ChemElem?>} */
export const NEW_BOND_PRESETS = Object.freeze({
    empty: _ => undefined,
    c_atom: _ => new ChemElem("C"),
    o_atom: _ => new ChemElem("O"),
    h_atom: _ => new ChemElem("H"),
    n_atom: _ => new ChemElem("N"),
    ch3_small: _ => new ChemElem("CH_3"),
    ch3_big: angle => {
        let builder = new MoleculeBuilderPart(new ChemElem("C"));
        builder.singleBond((angle + 270) % 360, 1.0, "H");
        builder.singleBond(angle, 1.0, "H");
        builder.singleBond((angle + 90) % 360, 1.0, "H");
        return builder.buildElement();
    },
    ch2_small: _ => new ChemElem("CH_2"),
    ch2_big: angle => {
        let builder = new MoleculeBuilderPart(new ChemElem("C"));
        builder.singleBond((angle + 270) % 360, 1.0, "H");
        builder.singleBond((angle + 90) % 360, 1.0, "H");
        return builder.buildElement();
    },
    oh_small: _ => new ChemElem("OH"),
    oh_big: angle => {
        let builder = new MoleculeBuilderPart(new ChemElem("O"));
        builder.singleBond(angle, 1.0, "H");
        return builder.buildElement();
    },
    cooh_small: _ => new ChemElem("COOH"),
    cooh_big: angle => {
        let builder = new MoleculeBuilderPart(new ChemElem("C"));
        builder.doubleBond((angle + 315) % 360, 1.0, "O");
        builder.singleBond((angle + 45) % 360, 1.0, "O")
            .singleBond(angle, 1.0, "H");
        return builder.buildElement();
    },
    ring_5: (angle, length) => {
        let builder = new MoleculeBuilderPart(new ChemElem("C"));
        builder.singleBond((angle + 1*72) % 360, length, "C")
            .singleBond((angle + 2*72) % 360, length, "C")
            .singleBond((angle + 3*72) % 360, length, "C")
            .singleBond((angle + 4*72) % 360, length, undefined);
        return builder.buildElement();
    },
    ring_6: (angle, length) => {
        let builder = new MoleculeBuilderPart(new ChemElem("C"));
        builder.singleBond((angle + 1*60) % 360, length, "C")
            .singleBond((angle + 2*60) % 360, length, "C")
            .singleBond((angle + 3*60) % 360, length, "C")
            .singleBond((angle + 4*60) % 360, length, "C")
            .singleBond((angle + 5*60) % 360, length, undefined);
        return builder.buildElement();
    },
});