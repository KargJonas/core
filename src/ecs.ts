import { Events, Entities } from "./interfaces";
import { FlowGroup } from "./flowGroup";

class ECS {
    debug = false

    /**
     * starting point for selecting components
     */
    all = new FlowGroup(this, [])

    /**
     * generate entity ids
     */
    lastId = 0

    /**
     * for performance reasons, i decided not to use reactiveX for this
     */
    events:Events = {}

    /**
     * list of all eneities 
     */
    entities: Entities = []

    /**
     * specifies if the emiting of onChnage sould be stopped
     */
    private _emitChanges = true

    /**
     * just serves the private property
     */
    get emitChanges() {
        return this._emitChanges
    }

    /**
     * sets the value, and if the va;ue s true it emits the event
     */
    set emitChanges(value:boolean){
        this._emitChanges = value

        //emit change if true
        if (this._emitChanges)
            this.emit("change")
    }

    constructor () { }

    /**
     * add entity to system
     * @param returnFlowGroup specifies if the function needs to return the flowGroup 
     * (set to false by default to prevent memory leaks)
     * @returns a flowGroup pointing to the component if returnFlowGroup is true
     */
    addEntity ( returnFlowGroup = false ) {
        this.entities[ this.lastId++ ] = { }

        //emit the events
        if (this._emitChanges)
            this.emit("change",this.lastId - 1)

        //return the flowGroup
        if (returnFlowGroup)
            return this.all.is(this.lastId - 1)
    }

    /**
     * emits event 
     */
    emit( message: string, data:any = undefined ) {
        if (!this.events[message]) return
        this.events[message].forEach(value => value(data))
    }

    /**
     * listen to events
     */
    on( message : string, callback : (data:any) => void ) {
        //create array if not already created
        if ( !this.events[ message ] )
            this.events[ message ] = [ callback ]
        else
            this.events[ message ].push( callback )
    }
}


export { ECS }