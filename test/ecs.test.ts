import { expect } from "chai"
import { ECS } from "../src/ecs"
import { FlowGroup } from "../src/flowGroup";

const { floor, random } = Math
const maxCount = 10

//reusable code
const shuffleArray = (arr: any[]) => arr
    .map(a => [Math.random(), a])
    .sort((a, b) => a[0] - b[0])
    .map(a => a[1]);

const addRandomEntities = () => {
    //create ecs
    const ecs = new ECS()

    //add entities
    const count = floor(random() * maxCount) || 1

    //add everything to the ecs
    for (let i = 0; i < count; i++)
        ecs.addEntity()

    //return the values
    return { ecs, count }
}

const addComponentsToRandomEntities = (ecs: ECS, max: number, name: string, nested = true) => {
    //generate random number
    const componentCount = floor(random() * max) || 1

    //shuffle keys
    const keys = shuffleArray(Object.keys(ecs.entities))

    //add components
    for (let i = 0; i < componentCount; i++) {
        if (nested)
            ecs.entities[keys[i]][name] = {
                data: "random components"
            }
        else
            ecs.entities[keys[i]][name] = floor(random() * max) + 7
    }

    //return the results
    return { componentCount, keys }
}

const awaitEvent = (ecs: ECS, name: string) => {
    return new Promise((res, rej) => {
        try {
            ecs.on(name, (data) => {
                res(data)
            })
        }
        catch (err) {
            rej(err)
        }
    })
}

const eventCountTest = (name: string) => {
    //generate an ecs and add random entities
    const { ecs, count } = addRandomEntities()

    //activate to debug mode
    ecs.debug = true

    //add random components
    addComponentsToRandomEntities(ecs, count, "testComponent", false)

    const queryCount = floor(random() * maxCount) + 7

    //query the data a random number of times
    let queries = [...Array(queryCount)].map(_ => ecs.all.get("testComponent"))

    //save the state of the events
    //it represents the changeDetected count
    let eventState = 0

    //subscribe to the events
    ecs.on(name, () => { eventState++ })

    //generate random value
    const randomValue = floor(random() * maxCount) + 7

    //change the data randomValue times
    for (let i = 0; i < randomValue; i++) {
        //generate random value
        const randomNewValue = floor(random() * maxCount) + 7 + i

        //shuffle queries
        queries = shuffleArray(queries)

        //modify the data
        queries[0].tracked[0].testComponent = randomNewValue
    }

    return { eventState, randomValue, queryCount }
}

//i want to have async and await
const main = async () => {

    describe("ecs", () => {
        it("should allow adding entities", () => {
            //create ecs
            const { ecs, count } = addRandomEntities()

            //get array length
            const result = Object.keys(ecs.entities).length

            //check length
            expect(result).to.be.equal(count)
        })

        it("should generate different ids for each new entity", () => {
            //create ecs
            const { ecs } = addRandomEntities()

            //get the ids
            const ids = Object.keys(ecs.entities)

            //get array length
            const result = ids.length

            //check length
            expect(result).to.be.equal(new Set(ids).size)
        })

        it("should not return a flowGroup when not passing anything to addEntity", () => {
            //generate ecs
            const ecs = new ECS()

            //addEntity
            const result = ecs.addEntity()

            expect(result).to.not.be.instanceOf(FlowGroup)
        })

        it("should return the correct entity when using .is", () => {
            //generate ecs
            const ecs = new ECS()

            //add an entity
            const flowGroup = ecs.addEntity(true)

            //select the component before to test the change emitter
            const selected = flowGroup.get("testComponent")

            //generate random value
            const randomValue = floor(random() * maxCount)

            //add component
            ecs.entities[ecs.lastId - 1].testComponent = {
                someParam: randomValue
            }

            //emit change
            ecs.emit("change")

            //get the result 
            const result = selected.tracked[0].testComponent.someParam

            //compare values
            expect(result).to.be.equal(randomValue)
        })

        it("should select all entities when using .all", () => {
            //create ecs
            const { ecs, count } = addRandomEntities()

            //select everything
            const result = ecs.all.get().tracked.length

            expect(result).to.be.equal(count)
        })

        it("should not select any entities when passing non-existing component name", () => {
            //create ecs
            const { ecs } = addRandomEntities()

            //select everything
            const result = ecs.all.get("non-existing").tracked.length

            expect(result).to.be.equal(0)
        })

        it("should select only the entities wich have the passed component name", () => {
            //create ecs
            const { ecs, count } = addRandomEntities()

            //add random components
            const { componentCount } = addComponentsToRandomEntities(ecs, count, "justATest")

            //select components
            const result = ecs.all.get("justATest").tracked.length

            expect(result).to.be.equal(componentCount)
        })

        it("should sync the data between queries", () => {
            //create ecs
            const ecs = new ECS()

            //add an entity
            ecs.addEntity()

            //generate random value
            const randomValue = floor(random() * maxCount)

            //generate another random value (different from the first)
            const anotherRandomValue = floor(random() * maxCount) + randomValue

            //add 1 component
            ecs.entities[ecs.lastId - 1].testComponent = {
                data: randomValue
            }

            //querry the same component 2 times
            const queries = shuffleArray([0, 0].map(value => ecs.all.get("testComponent")))

            //change the data in one of the queries
            queries[0].tracked[0].testComponent.data = anotherRandomValue

            //get the results
            const results = shuffleArray(queries.map(value => value.tracked[0].testComponent.data))

            expect(results[0]).to.be.equal(results[1])
        })

        it("should emit / listen to events", () => {
            //generate ecs
            const ecs = new ECS()

            //save the state of the evemt
            let eventRecived = false

            //add a callback to the next event loop tick
            setImmediate(_ => {
                expect(eventRecived).to.be.true
            })

            //listen to the event
            ecs.on("testEvent", _ => {
                eventRecived = true
            })

            //emit event
            ecs.emit("testEvent")
        })

        it("should not emit change when emitChanges is disabled", () => {
            //generate ecs
            const ecs = new ECS()

            //disable the emittin change
            ecs.emitChanges = false

            //save the state of the event
            let eventRecived = false

            //add a callback to the next event loop tick
            setImmediate(_ => {
                expect(eventRecived).to.be.false
            })

            //respond to the event
            ecs.on("change", _ => {
                eventRecived = true
            })

            //add an entity
            ecs.addEntity()
        })

        it("should emit change when you add an entity", () => {
            //generate ecs
            const ecs = new ECS()

            //async stuff ftw
            awaitEvent(ecs, "change").then(value => {
                expect(value).to.be.equal(ecs.lastId - 1)
            })

            //add component
            ecs.addEntity()
        })

        it("should not emit debugging events when debug is false", () => {
            //generate ecs
            const ecs = new ECS()

            //save the state of the event
            let eventRecived = false

            //add a callback to the next event loop tick
            setImmediate(_ => {
                expect(eventRecived).to.be.false
            })

            //add entity and get the flowGroup
            const query = ecs.addEntity(true).get("testComponent")

            //add a component
            ecs.entities[ecs.lastId - 1].testComponent = true

            //emit the changes
            ecs.emit("change")

            //handler for events
            const handler = () => {
                eventRecived = true
            }

            //subscribe to the events
            ecs.on("changeDetected", handler)
            ecs.on("changeResolved", handler)

            //change the data
            query.tracked[0].testComponent = false
        })

        it("should emit debugging events when debug is true", () => {
            //generate ecs
            const ecs = new ECS()

            //set debug to true
            ecs.debug = true

            //save the state of the event
            let eventRecived = false

            //add a callback to the next event loop tick
            setImmediate(_ => {
                expect(eventRecived).to.be.true
            })

            //add entity and get the flowGroup
            const query = ecs.addEntity(true).get("testComponent")

            //add a component
            ecs.entities[ecs.lastId - 1].testComponent = true

            //emit the changes
            ecs.emit("change")

            //handler for events
            const handler = () => {
                eventRecived = true
            }

            //subscribe to the events
            ecs.on("changeDetected", handler)
            ecs.on("changeResolved", handler)

            //change the data
            query.tracked[0].testComponent = false
        })

        it("should emit the right number of changeDetected events", () => {
            const { eventState, randomValue } = eventCountTest("changeDetected")

            expect(eventState).to.be.equal(randomValue)
        })

        it("should emit the right number of changeResolved events", () => {
            const { eventState, queryCount, randomValue } = eventCountTest("changeResolved")

            expect(eventState).to.be.equal(randomValue * queryCount)
        })
    })
}

main()
