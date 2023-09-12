import { 
    node, 
    ports, 
    port, 
    createTestNode,
    type Input,
    type Output,
} from "../src";

@node("simple_test")
@ports({
    input: ["in"],
    output: ["out"]
})
class SimpleTestNode {
    @port("in")
    public async handleIn(input: Input, output: Output) {
        console.log("called")
    }
};

describe("a simple node is able to function", () => {
    const testNode = createTestNode(SimpleTestNode, {
    })
})