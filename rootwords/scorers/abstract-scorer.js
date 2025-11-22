class Scorer {

    constructor() {
        if (new.target === Scorer) {
            throw new Error("Cannot instantiate abstract class Scorer directly");
        }
    }

    getScoringTargets(letters) {
        throw new Error("scoring targets not implemented")
    }
    
    scoreTree(rootNode) {
        throw new Error("score tree not implemented")
    }
}