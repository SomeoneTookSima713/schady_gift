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
 * @param {{id?: string, classes?: string[], attrs?: {[string]: string}, styles?: {[string]: string|null}}} options
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
    if (options.attrs) {
        for (let [key, val] of Object.entries(options.attrs)) {
            elem.setAttribute(key, val);
        }
    }
    if (options.styles) {
        for (let [key, val] of Object.entries(options.styles)) {
            elem.style.setProperty(key, val);
        }
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

export const INPUT_SCROLL_DELTA = -100;

/**
 * Makes the given number input element change it's value when scrolling while hovering over it
 * @param {HTMLInputElement} inputElem 
 * @param {number} normalIncrement 
 * @param {number?} [shiftIncrement] Defaults to the normal increment
 * @param {number?} [ctrlIncrement] Defaults to the normal increment
 * @throws {TypeError} When the given input element isn't of type `number`
 */
export function makeNumInputScrollable(inputElem, normalIncrement, shiftIncrement, ctrlIncrement) {
    if (inputElem.type !== "number") { throw new TypeError("input element's type isn't 'number'"); }

    let scrollDelta = 0;

    /** @type {(event: WheelEvent) => any} */
    let scrollHandler = function(event) {
        let inc = normalIncrement;
        if (event.ctrlKey) {
            inc = ctrlIncrement;
        } else if (event.shiftKey) {
            inc = shiftIncrement;
        }

        scrollDelta += event.deltaY / INPUT_SCROLL_DELTA;
        if (Math.abs(scrollDelta) >= 1) {
            // inputElem.value = (Number.parseFloat(inputElem.value) + Math.sign(scrollDelta) * Math.floor(Math.abs(scrollDelta)) * inc).toString();
            let num = Number.parseFloat(inputElem.value) + Math.sign(scrollDelta) * Math.floor(Math.abs(scrollDelta)) * inc;
            let min = Number.parseFloat(inputElem.min);
            let max = Number.parseFloat(inputElem.max);
            if (!Number.isNaN(min)) {
                num = Math.max(num, min);
            }
            if (!Number.isNaN(max)) {
                num = Math.min(num, max);
            }
            inputElem.value = num.toString();

            scrollDelta -= Math.sign(scrollDelta) * Math.floor(Math.abs(scrollDelta));
            inputElem.dispatchEvent(new Event("change"));
        }
    };

    inputElem.onpointerenter = () => {
        document.addEventListener("wheel", scrollHandler);
    };
    inputElem.onpointerleave = () => {
        document.removeEventListener("wheel", scrollHandler);
    };
}

/**
 * @param {HTMLElement} scrollElem What to scroll over
 * @param {HTMLInputElement} inputElem What to change when scrolling
 * @param {number} normalIncrement 
 * @param {number?} [shiftIncrement] Defaults to the normal increment
 * @param {number?} [ctrlIncrement] Defaults to the normal increment
 * @throws {TypeError} When the given input element isn't of type `number`
 */
export function makeNumInputIndirectlyScrollable(scrollElem, inputElem, normalIncrement, shiftIncrement, ctrlIncrement) {
    if (inputElem.type !== "number") { throw new TypeError("input element's type isn't 'number'"); }

    let scrollDelta = 0;

    /** @type {(event: WheelEvent) => any} */
    let scrollHandler = function(event) {
        let inc = normalIncrement;
        if (event.ctrlKey) {
            inc = ctrlIncrement;
        } else if (event.shiftKey) {
            inc = shiftIncrement;
        }

        scrollDelta += event.deltaY / INPUT_SCROLL_DELTA;
        if (Math.abs(scrollDelta) >= 1) {
            let num = Number.parseFloat(inputElem.value) + Math.sign(scrollDelta) * Math.floor(Math.abs(scrollDelta)) * inc;
            let min = Number.parseFloat(inputElem.min);
            let max = Number.parseFloat(inputElem.max);
            if (!Number.isNaN(min)) {
                num = Math.max(num, min);
            }
            if (!Number.isNaN(max)) {
                num = Math.min(num, max);
            }
            inputElem.value = num.toString();

            scrollDelta -= Math.sign(scrollDelta) * Math.floor(Math.abs(scrollDelta));
            inputElem.dispatchEvent(new Event("change"));
        }
    };

    scrollElem.addEventListener("pointerenter", () => {
        document.addEventListener("wheel", scrollHandler);
    });
    scrollElem.addEventListener("pointerleave", () => {
        document.removeEventListener("wheel", scrollHandler);
    });
}

/**
 * Makes the given select element change it's value when scrolling while hovering over it
 * @param {HTMLSelectElement} selectElem 
 */
export function makeSelectScrollable(selectElem) {
    let scrollDelta = 0;

    /** @type {(event: WheelEvent) => any} */
    let scrollHandler = function(event) {
        scrollDelta += event.deltaY / INPUT_SCROLL_DELTA;
        if (Math.abs(scrollDelta) >= 1) {
            selectElem.value = selectElem.options[Math.min(Math.max(selectElem.selectedIndex + Math.sign(scrollDelta), 0), selectElem.options.length)];
            scrollDelta -= Math.sign(scrollDelta) * Math.floor(Math.abs(scrollDelta));
            selectElem.dispatchEvent(new Event("change"));
        }
    };

    selectElem.onpointerenter = () => {
        document.addEventListener("wheel", scrollHandler);
    };
    selectElem.onpointerleave = () => {
        document.removeEventListener("wheel", scrollHandler);
    };
}

/**
 * @param {HTMLElement} scrollElem What to scroll over
 * @param {HTMLSelectElement} selectElem What to change when scrolling
 */
export function makeSelectIndirectlyScrollable(scrollElem, selectElem) {
    let scrollDelta = 0;

    /** @type {(event: WheelEvent) => any} */
    let scrollHandler = function(event) {
        scrollDelta += event.deltaY / INPUT_SCROLL_DELTA;
        if (Math.abs(scrollDelta) >= 1) {
            selectElem.value = selectElem.options[Math.min(Math.max(selectElem.selectedIndex + Math.sign(scrollDelta), 0), selectElem.options.length)];
            scrollDelta -= Math.sign(scrollDelta) * Math.floor(Math.abs(scrollDelta));
            selectElem.dispatchEvent(new Event("change"));
        }
    };

    scrollElem.onpointerenter = () => {
        document.addEventListener("wheel", scrollHandler);
    };
    scrollElem.onpointerleave = () => {
        document.removeEventListener("wheel", scrollHandler);
    };
}