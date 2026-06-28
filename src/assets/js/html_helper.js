/**
 * @template {HTMLElement} E
 * @callback EventFunc
 * @param {E} element
 * @returns {undefined}
 */

/**
 * 
 * @param {string} tag 
 * @param {string|HTMLElement[]} content 
 * @param {{id?: string, classes?: string[]}} options
 * @returns {HTMLElement}
 */
export function createSimpleElement(tag, content, options) {
    let elem = document.createElement(tag);
    options = options ? options : {};
    if (options.id) {
        elem.id = options.id;
    }
    if (options.classes) {
        elem.classList.add(...options.classes);
    }
    if (content instanceof Array) {
        content.forEach(e => elem.appendChild(e));
    } else {
        elem.innerHTML = content;
    }
    return elem;
}

/**
 * @param {string|HTMLElement[]} content
 * @param {{id?: string, classes?: string[], disabled?: boolean, title?: string, onclick?: EventFunc<HTMLButtonElement>, onmouseenter?: EventFunc<HTMLButtonElement>, onmouseleave?: EventFunc<HTMLButtonElement>}} [options]
 * @returns {HTMLButtonElement}
 */
export function createButton(content, options) {
    let elem = document.createElement("button");
    options = options ? options : {};
    if (options.id) {
        elem.id = options.id;
    }
    if (options.classes) {
        elem.classList.add(...options.classes);
    }
    if (options.onclick) {
        elem.onclick = () => options.onclick(elem);
    }
    if (options.onmouseenter) {
        elem.onmouseenter = () => options.onmouseenter(elem);
    }
    if (options.onmouseleave) {
        elem.onmouseleave = () => options.onmouseleave(elem);
    }
    if (options.disabled) {
        elem.disabled = options.disabled;
    }
    if (options.title) {
        elem.title = options.title;
    }
    if (content instanceof Array) {
        content.forEach(e => elem.appendChild(e));
    } else {
        elem.innerHTML = content;
    }
    return elem;
}

/**
 * @param {Array<[string, string]>} selectableOptions (first element is the HTML element's value, second is the displayed text)
 * @param {string} initialOption (value of one of the options)
 * @param {{id?: string, classes?: string[], oninput?: EventFunc<HTMLSelectElement>}} [options]
 * @returns {HTMLSelectElement}
 */
export function createSelect(selectableOptions, initialOption, options) {
    let elem = document.createElement("select");
    options = options ? options : {};
    if (options.id) {
        elem.id = options.id;
    }
    if (options.classes) {
        elem.classList.add(...options.classes);
    }
    if (options.oninput) {
        elem.oninput = () => options.oninput(elem);
    }
    for (let [i, [key, value]] of selectableOptions.entries()) {
        let opt_elem = document.createElement("option");
        opt_elem.value = key;
        opt_elem.innerText = value;
        if (key == initialOption) {
            opt_elem.selected = true;
        }
        elem.appendChild(opt_elem);
    }
    return elem;
}

/**
 * @param {number} initialValue 
 * @param {{id?: string, classes?: string[], autocomplete?: boolean, min?: number, max?: number, step?: number, oninput?: EventFunc<HTMLInputElement>}} [options]
 * @returns {HTMLInputElement}
*/
export function createNumberInput(initialValue, options) {
    let elem = document.createElement("input");
    elem.type = "number";
    options = options ? options : {};
    if (options.id) {
        elem.id = options.id;
    }
    if (options.classes) {
        elem.classList.add(...options.classes);
    }
    if (options.oninput) {
        elem.oninput = () => options.oninput(elem);
    }
    if (options.min) {
        elem.min = options.min.toString();
    }
    if (options.max) {
        elem.max = options.max.toString();
    }
    if (options.step) {
        elem.step = options.step.toString();
    }
    if (options.autocomplete) {
        elem.autocomplete = options.autocomplete ? "on" : "off";
    }
    elem.value = initialValue.toString();
    return elem;
}

/**
 * @param {string} initialValue 
 * @param {{id?: string, classes?: string[], autocomplete?: boolean, oninput?: EventFunc<HTMLInputElement>}} [options]
 * @returns {HTMLInputElement}
*/
export function createTextInput(initialValue, options) {
    let elem = document.createElement("input");
    elem.type = "text";
    options = options ? options : {};
    if (options.id) {
        elem.id = options.id;
    }
    if (options.classes) {
        elem.classList.add(...options.classes);
    }
    if (options.oninput) {
        elem.oninput = () => options.oninput(elem);
    }
    if (options.autocomplete) {
        elem.autocomplete = options.autocomplete ? "on" : "off";
    }
    elem.value = initialValue;
    return elem;
}

/**
 * @param {boolean} initialValue 
 * @param {{id?: string, classes?: string[], oninput?: EventFunc<HTMLInputElement>}} [options]
 * @returns {HTMLInputElement}
*/
export function createCheckboxInput(initialValue, options) {
    let elem = document.createElement("input");
    elem.type = "checkbox";
    options = options ? options : {};
    if (options.id) {
        elem.id = options.id;
    }
    if (options.classes) {
        elem.classList.add(...options.classes);
    }
    if (options.oninput) {
        elem.oninput = () => options.oninput(elem);
    }
    elem.checked = initialValue;
    return elem;
}