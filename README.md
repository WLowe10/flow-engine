
# Hawk Engine

Hawk Engine is a robust, modular workflow engine. This implements flow based programming concepts where each “node” lives in isolation and performs work in chains by propagating data down the flow. It uses decorators to create a beautiful and seamless developer experience and allows dependency injection. Many concepts are adopted from NestJS.

**This documentation is NOT complete. This library is currently a prototype. More comprehensize documentation will be made in further versions**

**Hawk engine is in development and the API may (likely) change**


## Usage/Examples

### Addition Flow

This node receives two numbers and outputs the sum. It also works as a control flow node since it waits until it has received two inputs. It has two ports, a and b, both are pseudo variables as expressed in a + b form.

```typescript
import { Input, Output, node, ports, port, useGuards } from "hawk-engine";


@node("add") //the name of the node to be referenced inside of a flow
@ports({
  input: ["a", "b"],
  output: ["out"] 
}) 
export class AddNode {
    private num1?: number = undefined;
    private num2?: number = undefined;

    @port("a") //listens on a port called "a"
    public async handleNumOne(input: Input, output: Output) {
        const num = input.getValue();

        if (typeof this.num2 === "number") {
            const sum = num + this.num2;

            output.send(["out"], sum);
        }

    };

    @port("b") //listens on a port called "b"
    public async handleNumTwo(input: Input, output: Output) {
        const num = input.getValue();

        if (typeof this.num1 === "number") {
            const sum = num + this.num1;

            output.send(["out"], sum);
        }
    };

    //this method resets the stored numbers to undefined
    private flush() {
        this.num1 = undefined;
        this.num2 = undefined;
    }
}

```

### Engine

The engine allows you to fork a "context". Services can be registered to the engine allowing you to implement dependency injection into your nodes or your others services.

```typescript
//create an engine
const engine = new Engine({
    nodes: [
        AddNode,
    ],
    services: [],
});

//create a context
//this context has one node of type 'add'
//this flow will start at the 'root' node, and will send the number 2 both of its outputs
// root:out -> ( 1:a, 2:a )
//the add node will output 4 to the console.

const context = engine.createContext({
    nodes: [
        {
            id: "1",
            type: "add",
        },
    ],
    connections: [
        {
            source: {
                id: "root",
                port: "out"
            },
            target: {
                id: "1",
                port: "a"
            },
        },
        {
            source: {
                id: "root",
                port: "out"
            },
            target: {
                id: "1",
                port: "b"
            },
        },
    ],
}, 
//global data that can be used by injecting the "ConfigService" in an injectable
{}, 
{
    //"root" is a pseudo node. if strict is not false here, the context engine will throw an error 
    strict: false
});

const start = async () => {
    await context.setup()

    //insert and trigger the pseudo node, root
    await context.createTriggerNode("root")(["out"], {
        payload: 2
    })
};

start();
```

## Guards 

a guard can be used to "protect" a node from executing. the implementation is very similar to NestJS.

```typescript
import { injectable, Reflector } from "../../src";
import type { IGuard, GuardContext } from "../../src";

@injectable()
export class TestGuard implements IGuard {
    constructor(
        private reflector: Reflector,
    ) {};

    canProcess(ctx: GuardContext): boolean {
        const packet = ctx.getPacket();
        const payload = packet.getPayload();

        const items = this.reflector.getAllAndOverride("items", [
            ctx.getHandler(),
            ctx.getClass(),
        ])

        //for our addition example above, if the number inputted is greater than or equal to 100, the node will not process
        return payload < 100; 
    }
}
```

now, a guard can be used either for all or a nodes ports, or for a specific port,

```typescript
import { Input, Output, node, ports, port, useGuards } from "../../src";
import { TestGuard, OtherGuard } from "../guards";

@node("add")
@ports({
  input: ["a", "b"],
  output: ["out"] 
}) 
@useGuards(TestGuard)
export class AddNode {
    private numA?: number = undefined;
    private numB?: number = undefined;

    @port("a") //is protected by TestGuard
    public async handleNumOne(input: Input, output: Output) {
        this.numA = input.getValue();

        this.add(output);
    };

    @port("b") 
    @useGuards(OtherGuard) // is protected both TestGuard and OtherGuard
    public async handleNumTwo(input: Input, output: Output) {
        this.numB = input.getValue();

        this.add(output);
    };

    private add(output: Output) {
        if (typeof this.numA === "number" && typeof this.numB === "number") {
            const sum = this.numA + this.numB;

            console.log("sum", sum)
            output.send(["out"], sum);

            //reset the numbers
            this.flush();
        }
    };

    //this method resets the stored numbers to undefined
    private flush() {
        this.numA = undefined;
        this.numB = undefined;
    }
}
```