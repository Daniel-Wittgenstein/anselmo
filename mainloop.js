
//okay.

class MainLoop {
    //note that the rendering rate is entirely browser dependent.
    //the update rate can be higher or lower!
    constructor(updates_per_second, update, render) {
        this.req(0)
        this.updates_per_second = updates_per_second
        this.update_rate = 1000 / updates_per_second
        this.time_bank = 0
        this.update = update
        this.render = render
    }

    req (time_stamp) {
        //handle the fact that the time interval
        //is wrong at the beginning:
        if (!window.GLOBAL_ERROR_TRIGGERED) {
            window.requestAnimationFrame( this.req.bind(this) )
        }
        let elapsed = time_stamp - this.last_time_stamp
        let starting_interval = false
        if(!elapsed || !this.last_time_stamp) starting_interval = true
        this.last_time_stamp = time_stamp
        if (starting_interval) return
        //elapsed is the elapsed millisecs since last requestAnimationFrame
        //now compute how many updates that means
        let update_amount = 0
        this.time_bank += elapsed
        if (this.time_bank > 2000) this.time_bank = 2000 //cap
        while (this.time_bank >= this.update_rate) {
            this.time_bank -= this.update_rate
            update_amount++
        }
        if (update_amount >= 3) {update_amount = 3} //cap
        for (let i = 0; i < update_amount; i++) {
            this.update(elapsed)
        }
        if (update_amount > 0) this.render(elapsed)
    }

}