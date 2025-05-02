const hardcodedTable = {
    terminals: ["id", "+", "*", "(", ")", "$"],
    nonterminals: ["E", "T", "F"],

    rules: [
        { matches: ["E", "+", "T"], result: "E" }, 
        { matches: ["T"], result: "E" },           
        { matches: ["T", "*", "F"], result: "T" }, 
        { matches: ["F"], result: "T" },           
        { matches: ["(", "E", ")"], result: "F" }, 
        { matches: ["id"], result: "F" },         
    ],
    
    states: [
        { actions: { "id": "S5", "(": "S4" }, goto: { "E": 1, "T": 2, "F": 3 } },
        { actions: { "+": "S6", "$": "accept" }, goto: {} },
        { actions: { "+": "R2", "*": "S7", ")": "R2", "$": "R2" }, goto: {} },
        { actions: { "+": "R4", "*": "R4", ")": "R4", "$": "R4" }, goto: {} },
        { actions: { "id": "S5", "(": "S4" }, goto: { "E": 8, "T": 2, "F": 3 } },
        { actions: { "+": "R6", "*": "R6", ")": "R6", "$": "R6" }, goto: {} },
        { actions: { "id": "S5", "(": "S4" }, goto: { "T": 9, "F": 3 } },
        { actions: { "id": "S5", "(": "S4" }, goto: { "F": 10 } },
        { actions: { "+": "S6", ")": "S11" }, goto: {} },
        { actions: { "+": "R1", "*": "S7", ")": "R1", "$": "R1" }, goto: {} },
        { actions: { "+": "R3", "*": "R3", ")": "R3", "$": "R3" }, goto: {} },
        { actions: { "+": "R5", "*": "R5", ")": "R5", "$": "R5" }, goto: {} },
    ]
};


$(document).ready(function () {
    initParseTable(hardcodedTable);
});
