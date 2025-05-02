class ParserLogic {

    constructor(table, tokens) {
        this.table = table;
        this.tokens = [];
        this.rules = [];
        this.stack = [];

        for (const token of tokens) {
            this.tokens.push({
                value: token,
                highlight: 0
            });
        }

        for (const rule of table.rules) {
            this.rules.push({
                data: rule,
                highlight: 0
            });
        }

        this.stackPush(0, "state");
        this.idle = true;
        this.finished = false; 
    }


    getData() {
        return {
            table: this.table,
            tokens: JSON.parse(JSON.stringify(this.tokens.slice())),
            rules: JSON.parse(JSON.stringify(this.rules.slice())),
            stack: this.stack.slice(),
            finished: this.finished
        };
    }


    setData(data) {
        this.table = data["table"];
        this.tokens = data["tokens"];
        this.rules = data["rules"];
        this.stack = data["stack"];
        this.finished = data["finished"];
    }

    
    stackPush(newData, newType) {
        this.stack.push({
            type: newType,
            highlight: 0,
            data: newData
        })
    }


    peek() {
        if (this.stack.length == 0) throw new Error("ParserLogic.peek: The stack is empty.");
        return this.stack[this.stack.length - 1];
    }


    pop() {
        if (this.stack.length == 0) throw new Error("ParserLogic.pop: The stack is empty.");
        return this.stack.pop();
    }


    getStack() {
        let stackStr = "";
        for (const val of this.stack)
            stackStr += val["data"];
        return stackStr;
    }


    // Generator Function which return states with yield between highlighting the current token shifted.
    // Pushes the next token and its state from the argument onto the stack.
    * shift(newState) {
        if (this.tokens.length == 0) throw new Error('ParserLogic.shift: There are no tokens to shift.');
        
        yield;

        this.tokens[0]["highlight"] = 2;
        yield;

        const nextToken = this.tokens.shift();
        this.stackPush(nextToken["value"], "token");
        this.stackPush(newState, "state");
    }

    // Generator Function which returns states with yield and controls reducing a rule index from the table.
    // Validates the rules, pops tokens that match, and goes through state transitions from the goto table.
    * reduce(rule) {
        rule = rule - 1;

        if (rule < 0 || rule >= this.table.rules.length) throw new Error("ParserLogic.reduce: There is invalid rule index.");

        yield;

        this.rules[rule]["highlight"] = 1;
        yield;

        const matchRule = this.table.rules[rule];
        const matchTokens = matchRule.matches;
        
        // Pops matching tokens
        for (let i = matchTokens.length - 1; i >= 0; i--) {
            this.pop();
            
            let check = this.pop();
            if (check["type"] != "token" && check["type"] != "rule")
                throw new Error("ParserLogic.reduce: There is an unexpected stack element.");

            if (check["data"] != matchTokens[i])
                throw new Error("ParserLogic.reduce: Failure to match for production rule.");
        }
        yield;
        
        // Gets top state and pushes the rule's result
        const state = this.peek();

        if (state["type"] != "state")
            throw new Error("ParserLogic.reduce: Failure to find state index in stack.");
        
        const result = matchRule.result;
        this.stackPush(result, "rule");
        const stateIndex = state["data"];

        if (stateIndex < 0 || stateIndex >= this.table.states.length)
            throw new Error("ParserLogic.reduce: There is an unexpected state index ${stateIndex}.");

        // Goto Table Transitions
        let gotoElements = this.table.states[stateIndex].gotoElements;

        if (result in gotoElements) highlightElement(gotoElements[result]);
    
        const goto = this.table.states[stateIndex].goto;

        if (!(result in goto))
            throw new Error("ParserLogic.reduce: Failure to resolve goto for rule.");

        const newState = goto[result];
        this.stackPush(newState, "state");
    }

    // Generator Function for the main parsing loop to process tokens and assign actions from the table.
    // Performs initial validation, gets the next token's value, and completes an action based on the rule.
    * parse() {
        if (this.tokens == null || this.tokens.length == 0)
            throw new Error("ParserLogic.parse: There are no tokens to parse.");
        
        while (this.tokens != null && this.tokens.length > 0) {
            // Get state of tokens and validates them
            this.idle = false;
            
            const state = this.peek();
            if (state["type"] != "state")
                throw new Error("ParserLogic.parse: Failure from expected state index in stack.");

            const stateIndex = state["data"];
            if (stateIndex < 0 || stateIndex >= this.table.states.length)
                throw new Error("ParserLogic.parse: Thre is an unexpected state index.");
        
            // Get the next token's value and determine an action
            const nextToken = this.tokens[0]["value"];
            this.tokens[0]["highlight"] = 1;
            
            let actionElements = this.table.states[stateIndex].actionElements;
            clearHighlight();

            yield;

            if (nextToken in actionElements) highlightElement(actionElements[nextToken]);
            
            const actions = this.table.states[stateIndex].actions;
            if (!(nextToken in actions))
                throw new Error("ParserLogic.parse: Failure to resolve action for token.");
            const nextAction = actions[nextToken];
    
            // Action Handler
            if (nextAction == "accept") {
                successHighlight();
                this.finished = true;
                yield;
            }
            else if (nextAction.charAt(0) == 'S') {
                let shiftState = parseInt(nextAction.substring(1));
                yield* this.shift(shiftState);
            }
            else if (nextAction.charAt(0) == 'R') {
                let reduceRule = parseInt(nextAction.substring(1));
                yield* this.reduce(reduceRule);
            }
            else {throw new Error("ParserLogic.parse: There is an unknown action.");}
    
            this.idle = true;
            yield;
        }
        return true;
    }
}


function displayParseTable(table) {
    let tableDiv = $(".parser-table");
    tableDiv.empty();
    table.elements = [];

    // Add the Titles
    let header = $("<tr></tr>");
    header.append("<th></th>");
    header.append(`<th class="parser-title" colspan=${table.terminals.length}>Action</th>`);
    header.append(`<th class="parser-space"></th>`); 
    header.append(`<th class="parser-title" colspan=${table.nonterminals.length}>Goto</th>`);
    tableDiv.append(header);

    // Add the "State" and identifiers (id + * ( ) $)
    let subheader = $("<tr></tr>");
    subheader.append(`<td class="parser-title">State</td>`);
    for (const terminal of table.terminals)
        subheader.append(`<td class="parser-data">${terminal}</td>`);
    subheader.append(`<td class="parser-space"></td>`); 
    for (const nonterminal of table.nonterminals)
        subheader.append(`<td class="parser-data">${nonterminal}</td>`);
    tableDiv.append(subheader);

    // Add the main data into the table
    for (let stateIndex = 0; stateIndex < table.states.length; stateIndex++) {
        let state = table.states[stateIndex];
        state.actionElements = {};
        state.gotoElements = {};

        let row = $("<tr></tr>");
        row.append(`<td class="parser-title">${stateIndex}</td>`);

        for (const terminal of table.terminals) {
            let element = null;
            if (terminal in state.actions)
                element = $(`<td class="parser-data">${state.actions[terminal]}</td>`);
            else
                element = $(`<td class="parser-data"></td>`);
            
            row.append(element);
            state.actionElements[terminal] = element;
            table.elements.push(element);
        }

        row.append(`<td class="parser-space"></td>`); 
        for (const nonterminal of table.nonterminals) {
            let element = null;
            if (nonterminal in state.goto)
                element = $(`<td class="parser-data">${state.goto[nonterminal]}</td>`);
            else
                element = $(`<td class="parser-data"></td>`);
            
            row.append(element);
            state.gotoElements[nonterminal] = element;
            table.elements.push(element);
        }
        tableDiv.append(row);
    }
}

function clearHighlight() {
    $(".table-complete").removeClass("table-complete");
    $(".parser-highlight").removeClass("parser-highlight");
    $(".parser-highlight-failure").removeClass("parser-highlight-failure");

    if (context != null) {
        for (let rule of context.rules) rule["highlight"] = 0;
    }
}


function highlightElement(element) {
    if (element.text() != "") element.addClass("parser-highlight");
    else element.addClass("parser-highlight-failure");
}


function successHighlight() { $(".parser-table").addClass("table-complete"); }


function updateStackList() {
    let list = $(".stack-list");
    list.empty();
    let allItems = [];

    for (const item of context.stack) {
        let itemClass = "stack-item";
        if (item["highlight"] === 2) { itemClass += " highlight-yellow"; }
        else if (item["highlight"] === 1) { itemClass += " highlight-progress"; }

        let element = $(`<span class="${itemClass}">${item["data"]}</span>`);
        list.append(element);
        allItems.push(element);
    }

    context.stackElements = allItems;
}


function updateTokensList() {
    let list = $(".tokens-list");
    list.empty();
    let allTokens = [];
    
    for (const token of context.tokens) {
        let tokenClass = "token";
        if (token["highlight"] === 2) { tokenClass += " highlight-yellow"; }
        else if (token["highlight"] === 1) { tokenClass += " highlight-progress"; }

        let element = $(`<span class="${tokenClass}">${token["value"]}</span>`);
        list.append(element);
        allTokens.push(element);
    }

    context.tokenElements = allTokens;
}


function updateProductionRules() {
    let ruleList = $(".grammar-rule-list");
    ruleList.empty();
    let allRules = [];

    for (let i = 0; i < context.rules.length; i++) {
        const rule = context.rules[i];
        const data = rule.data;

        let ruleClass = "production-rule";

        // Create a jQuery element
        const ruleContent = `${data.result} \u2192 ${data.matches.join(' ')}`;
        const element = $(`
            <span class="rule-container">
                <span class="rule-index">${i + 1}.</span>
                <span class="${ruleClass}">${ruleContent}</span>
            </span>
        `);

        ruleList.append(element);
        allRules.push(element);
    }

    context.ruleElements = allRules;
}


let table = null;
let running = false;
let error = false;
let context = null;
let history_buffer = [];
let steps_since_idle = 0;


function initParseTable(ptable) {
    table = ptable;
    displayParseTable(ptable);
}


function pushHistory() { history_buffer.push(context.getData()); }


function popHistory() { 
    if (history_buffer.length > 0) {
        let hist = history_buffer.pop();
        context.setData(hist);
    }
}


function splitTokens(table, text) {
    const terminals = table.terminals;
    let tokens = [];
    let buf = "";

    for (let char_index = 0; char_index < text.length; char_index++) {
        let current_c = text.charAt(char_index);

        if (current_c == '\t' || current_c == '\r' || current_c == '\n' || current_c == " ") continue;
        
        buf += current_c;

        if (terminals.includes(buf)) {
            tokens.push(buf);
            buf = "";
        }
    }

    if (buf.length != 0) throw new Error("splitTokens: There is an unrecognized token trying to be split.");
    
    return tokens;
}


let parse_routine = null;
let simulateInterval = null;


$("#run-btn").click(function () {
    if (running || table == null) return;
    
    let textInput = $("#text-input");
    let tokens = splitTokens(table, textInput.val());

    running = true;
    error = false;
    context = new ParserLogic(table, tokens);
    parse_routine = context.parse();

    history_buffer = [];
    steps_since_idle = 0;

    $(".btn-success").addClass("disabled");
    $(".running-controls").removeClass("disabled");
    $(".stack-container").removeClass("disabled");
    $(".tokens-container").removeClass("disabled");
    $(".stack-textbox").val(context.getStack());
    updateStackList();
    updateTokensList();
    updateProductionRules();

    textInput.prop('readonly', true);

    if (simulateInterval != null) {
        clearInterval(simulateInterval);
        simulateInterval = null;
    }    

});


$("#next-btn").click(function () {
    if (!running || error || parse_routine == null || context.finished) return;
    
    try {
        if (context.idle) {
            pushHistory();
            steps_since_idle = 0;
        }
        parse_routine.next();
        steps_since_idle++;
    
        $(".stack-textbox").val(context.getStack());
        updateStackList();
        updateTokensList();
        updateProductionRules();
    }
    catch (e) {
        error = true;
        logParseError(e);
    }
});


$("#back-btn").click(function () {
    if (!running || error || parse_routine == null) return;

    if (history_buffer.length == 0) return;
    
    if (!context.idle) {
        while (!context.idle)
            parse_routine.next();
    }
    
    // Pop twice for the first step to reach previous instruction
    if (steps_since_idle <= 2) popHistory();
    
    popHistory();
    pushHistory();
    parse_routine.next();
    parse_routine.next();
    steps_since_idle = 2;
    
    $(".stack-textbox").val(context.getStack());
    updateStackList();
    updateTokensList();
    updateProductionRules();
});


$("#simulate-btn").click(function () {
    if (!running || error || parse_routine == null || context.finished) return;
    if (simulateInterval != null) return; 

    if (context.idle) {
        pushHistory();
        steps_since_idle = 0;
    }

    simulateInterval = setInterval(() => {
        try {
            const result = parse_routine.next();
            steps_since_idle++;

            $(".stack-textbox").val(context.getStack());
            updateStackList();
            updateTokensList();
            updateProductionRules();

            if (result.done || context.finished) {
                clearInterval(simulateInterval);
                simulateInterval = null;
            }
        } catch (e) {
            error = true;
            clearInterval(simulateInterval);
            simulateInterval = null;
            logParseError(e);
        }
    }, 200); 
});
