 

/*

ohne entity rendering packt er 127 entities noch ganz gut
bei 59-60 fps (an der grenze zum nicht mehr die 60 fps schaffen,
die er sollte) mit rendering sinkt er auf 58-60 ab. das heißt, dass das rendering
überhaupt nicht das Problem ist. aber kollisionen auch nicht, denke ich,
habe es mit console.time getimet und es sah gut aus. außerdem
sind so viele entities vollkommen ausreichend.
wir haben noch nicht einmal die offensichtliche (und recht einfache)
optimierung eingebaut, dass nur entities, die zu sehen sind,
geupdatet werden und es läuft schon vollkommen ausreichend schnell.

jetzt werden nur noch entities on screen gerendert: scheint
bei vielen entities ein paar extra frames rauszuholen (aber nicht viel).
nicht extensiv getestet, aber auch egal.

nächste optimierung: nur noch gegner updaten, die on screen
    ODER in der nähe sind. okay. gemacht. das bringt sehr offensichtlich etwas.
    wenn viele gegner an einer stelle sind dann droppt die framerate
    nur noch wenn du in dem bereich bist


Das funktioniert aber noch falsch mit auf dem boden landen, ein frame
lang wird man IM BODEN GERENDERT, DAS IST KACKE
danach kollision dots am player links rechts anpassen (vielleicht brauchen
    wir mehr als 4, wobei wir sind nur 32 hoch oder? 0 8 16 32 reicht doch?)


If entities get stuck in walls (and yes, sometimes they do)
always remember that it could be fixed by setting more
collision dots or setting extra collision dots more on the
outside; that can help a lot. For example the Killa sometimes
gets stuck in walls, but he is very fast and has no
additional dots further away from his body, so it's
not surprising that he penetrates walls sometimes,
you could experiment with additional dots and it might help.


1. tag: rendering, bilder laden, grid utility, main loop, klassen,
    simple animierte sprites, kudo designt (hund)

2. tag: tile map collision und entity to entity collision,
    level templates to map, spieler gehen, springen,
    mit wänden kollidieren, gegner läuft hin und her,
    kollidiert mit wänden, kehrt um

3. tag: entity to entity collision gefixt, inkonsistenzen
    bei spielerkoordinaten gefixt,
    angefangen, gegnerverhalten einzubauen,
    bloogie gemacht (charge verhalten)

4. tag: springendes gegnerverhalten mit allen dazugehörigen kollisionen
    ein paar subklassen von gegnern gemacht, die verhalten
    kombinieren und variieren: pumpkin, sinner (ohne eigene grafik bisher),
    marata, killa, infektor, spikeball
    mit bloogie sind das bisher 7 gegner (kudo zählt noch nicht wirklich, hat
        kein interessantes verhalten)

5. tag: coins, leitern, level templates unterstützen jetzt entities
        und man kann die legende beliebig anpassen und
        verschiedene sections.
        air/mid/underground, komplettes leven wird gebaut, kamera
        scrolling an den rändern funktioniert

6. tag: l. beim umzug geholfen, schalter die boden aktivieren

7 tag (1. märz 2022): schalter können jetzt nicht nur an, sondern
auch ausgeschaltet werden; es werden nur noch gegner gerendert,
die auf dem bildschirm sind und nur noch gegner in einem
bestimmten abstand geupdatet. experimentelles time bubble feature eingebaut.
fixed landing on ground. yeah! jetzt landen spieler und auch gegner
richtig pixel genau auf dem grund. und ohne viel zusätzlichen
rechenaufwand oder zusatzkollisionen. pumpkin bottom dots position gefixt.
insgesamt sind kollisionen und bewegungen ein bisschen ein chaos, aber
keine lust, es zu fixen. das würde viel zeit erfordern und das hier ist
nur ein prototyp.

8. tag: unten kamera position scroll gefixt, zerstörbare sandtiles,
time freeze bubble zeigt jetzt auch auf tiles wirkung, sieht man richtig.
title screen gebaut

9. tag: space ship screen mit planetenauswahl gebaut

************ lange nichts mehr gemacht.






the only libraries we need are seedrandom
and howler

*/


/*
    methods:
        move(deltax, deltay)

    generic property setters:    
        set_angle (direction movement)
        set_speed
        set_animation_speed
        set_animation_name
        create_bounding_box -> you can have several per creature

    event handlers:
        collide_with_player -> see: collide_with_creature
        collide_with_map(tile_type, tile_x, tile_y, bounding box)
        collide_with_creature(enemyx, enemyy, boundingbox1, boundingbox2)
            -> probably requires keeping a 2d-array or a
            hashmap of locations
            for fast access
        update
        animation_tick
        render
        */


window.dd = function() {debugger}

let SEEED = 0 //random seed

let debug = {
    log_stats: 0, //truthy / falsey
    log_stats_interval: 3000, //milliseconds

    show_collision_boxes: 0, //enable/disable with alt + c, also show collision dots
    log_player_state: 0,

    highlight_tile: 0,
    highlight_tile_x: 10,
    highlight_tile_y: 10,

    god_mode: 0, //not just invincible, also flying around
        //and no clip so you can see the entire map
        //enable /disable with alt + g

    test_template: false, //= no debug
                          //template id: start level with this template

    test_entity_rendering_px: 0, //must be falsey for production:
        //if true: positive integer: amount of pixels where entities
        //are NOT rendered even though they are on screen
        //if true: negative integer: amount of pixels where entities
        //ARE RENDERED even though they ARE NOT on screen 

    create_extra_entities: 0, //WARNING: should be 0 for production.
        //1 creates 10 entities, 2 creates 20 entities etc.!

    quick_start: 1, //should be 0 for production
    
}

//SETTINGS:

const settings = {
    isOverlayTile: (tile) => {
        //which tiles are rendered in the foreground
        if (tile === 16) return true //stone walk-through      
        if (tile === 13) return true  //stone not walk-through: also rendered in the foreground additionally,
            //to avoid head appearing in front of it when jumping inside inner corridor
        return false
    },
    
    doesTileCollide: (tile) => {
        //this sets which tiles are walkthrough and which aren't. walkthru pass through tile_collision 
        if (tile === -1) return false //empty
        if (tile === 16) return false //stone walk-through  
        return true
    },
    
}




let GAME_UPDATE_RATE = 60 //should be 60; lower for testing (fps)

collision_area_size_setting = 60 //for faster
        //entity to entity collisions. different values
        //will change performance (size in pixels)
        //lower: bigger grid size / higher: more entities
        //share the same area -> more collisions to check

collision_area_buffer_left = 2 //2 should be enough (hopefully)
collision_area_buffer_right = 2 //2 should be enough (hopefully)

let general = {
    render_tolerance_x: 64 + 32, //should be width of widest entity + a bit of leeway
    render_tolerance_y: 128 + 32, //should be height of highest entity + a bit of leeway
    update_tolerance_x: 200,
    update_tolerance_y: 150,
}


//update the array if you add a dot with a new collision id:
//currently you can have 6 of each but left /right only 4

const allowed_collision_ids_list = [

    "top1", "top2", "top3",
    "top4", "top5", "top6",
    
    "left1", "left2", "left3",
    "left4", 
    
    "right1", "right2", "right3",
    "right4", 
    
    "bottom1", "bottom2", "bottom3",
    "bottom4", "bottom5", "bottom6",
    
    "sloper", 
    "infector",

]
let allowed_collision_ids = new Set(allowed_collision_ids_list)




//global constants holding unique values: leave as they are
const out_of_bounds_x = {}
const out_of_bounds_y = {}



let my_random_seeded =  new Math.seedrandom(SEEED)

let rnd = (min, max) => {
    //unpredictable
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor( Math.random() * (max - min + 1) ) + min
}


let seeded_rnd = (min, max) => {
    //seeded; predictable
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor( my_random_seeded() * (max - min + 1) ) + min
}


let maybe = (probability, value, value2) => {
    //this is used for level generation, hence it uses seeded rnd
    //errr. does not work??? or does ? don't get it
    let r = seeded_rnd(1, 100)
    if (r <= probability) {
        return value
    } else {
        return value2
    }
}

function shuffle(array) {
    //no, this is not the fastest possible implementation
    //by far, but it does not matter
    return array
        .map(value => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value)
}



let one_of = (arr) => {
    return arr[rnd(0, arr.length-1)]
}

function cls() {
    let el = document.getElementById("log")
    el.innerHTML = ""
}

function log(txt) {
    let el = document.getElementById("log")
    el.innerHTML = txt
}

class Entity {
    constructor() {

        //all entities need to have a total_height
        //so they can correctly land on ground after falling
        //for most entities this is 32, simple because their
        //sprite is 32 pixels high. but for bigger
        //enemies this has to be adjusted
        //for small monsters: if a monster is smaller than 32px but its image
        //is 32 pixels high and the monster is located at the very
        //bottom of the image, then 32 px is fine!

        this.destroys_sand_tiles = true
        this.min_speed_to_destroy_sand_tile = 0 //higher for player

        this.total_height = 32

        this.anim_frame = 0
        this.anim_speed = 5
        this.anim_counter = 0
        this.falling_acceleration = 0.03
        this.max_falling_speed = 16


        this.last_speed_y = 0

        this.x = 0
        this.y = 400
        this.direction = 1
        this.walker = true
        this.collision_on = true
        this.speed_y = 0
        this.falls = true
        this.accel = 0
        this.state = "falling"
        this.sub_state = false

        /* valid states so far:
                falling, on_ground, jumping

            sub-states:
                on_ground -> walking, standing
        */
        /* collision_box: each entity has only one. it's used
        for entity to entity collision
        collision_dots: each entity can have several. they are used
        for entity vs map collision
        */
        this.collision_box = { x: 0, y: 0, w: 32, h: 32 }

        this.collision_dots = [
            {
                id: "bottom1",
                x: 12,
                y: 33,
            },
        ]

    }


    destroy() {
        this.level.remove_entity(this)
    }

    request_start_walking_frame() {
        return 0
    }

    request_next_walking_frame() {
        //standard simple walking animation
        //with two frames. monster sub-classes can override this.
        if (this.anim_frame === 0) {
            return 1
        } else {
            return 0
        }
    }

    request_standing_frame() {
        return 0
    }

    update(info) {
        //must be present (rly? probably not anymore), 
        //but you don't need to use it.
    }

    get_dot_position_on_map(dot) {
        //in pixels, where it really is on the map
        let entity = this
        return {
            x: entity.x + dot.x,
            y: entity.y + dot.y,
        }        
    }

    get_dot_position_on_screen(dot) {
        let entity = this
        return {
            x: entity.x + dot.x,
            y: entity.y + dot.y,                
        }
    }


    start_falling() {
        //if you were previous walking on ground, not if you were
        //previously jumping. for the latter look at stop_jumping
        this.state = "falling"
        this.sub_state = false
        if (debug.log_player_state && this.is_player) console.log("start falling")
    }

    land_on_ground(info) {
        this.y -= this.last_speed_y

        /*we have to position the entity exactly on the ground
        precise to one pixel. we only know that a collision
        between the collision dot and the map took place.
        now we need to check all dots and see which one is
        on the map and which one is not
        OR: we need to get the tile at the position of the
        collision dot. assuming this is the first ground tile
        (a reasonable assumption only if the falling velocity isn't too high,
        in which case there would be higher penetration)
        we can get the upper position of the ground tile, i mean
        the y-position basically. but where to get this info from ...
        errr from map???
        */

        let lowest_tile_y = -66666
        let collided_at_x
        let collided_at_y
        let collided_at_value

        const tile_standing_on_coords = {}
        
        for (let i = 1; i < 7; i++) {
            let o = info.coll.entity_vs_map["bottom" + i]
            if (o.collides) {
                lowest_tile_y = o.tile_y

                collided_at_x = o.tile_x
                collided_at_y = o.tile_y
                collided_at_value = info.level.map.get(o.tile_x, o.tile_y)
                tile_standing_on_coords.x = o.tile_x
                tile_standing_on_coords.y = o.tile_y
            }
        }

        if (lowest_tile_y === -66666) throw `land_on_ground was triggered, 
            but there is no bottom dot that could have triggered it?!`


        //destroy sand tiles:
        if (  
            this.speed_y >= this.min_speed_to_destroy_sand_tile
            && this.destroys_sand_tiles
            ) {
            let target = false
            let v = collided_at_value
            if (v === 7) target = 8
            if (v === 8) target = 9
            if (v === 9) target = -1
            if (target) info.level.map.set(collided_at_x, collided_at_y, target)
        }

        let pp = info.level.get_px_position_from_tile_position(0, lowest_tile_y)
        let yyy = pp.y
        this.y = yyy - this.total_height
        this.last_speed_y = 0
        this.speed_y = 0
        this.accel = 0
        this.state = "on_ground"
        this.sub_state = "standing"
        //if (debug.log_player_state && this.is_player) console.log("landed on ground")
        if (this.is_player) {
            //console.log("LANDED ON GROUND. y:", this.y)
        }
        

        //special disappearing tile:
        if (collided_at_value === 10) {
            console.log("LANDED ON SPECIAL DISAPPEARING TILE", tile_standing_on_coords )
            const dx = 0
            const dy = -8
            info.level.map.set(tile_standing_on_coords.x, tile_standing_on_coords.y, -1)
            info.level.map.set(tile_standing_on_coords.x + dx, tile_standing_on_coords.y + dy, 2)          
          }
  
        
        //invisible tile:
        if (collided_at_value === 14) {
            console.log("HAUPTSCHILE")
            info.level.map.set(tile_standing_on_coords.x, tile_standing_on_coords.y, 15)        
        }

          
        


    } //land_on_ground


    start_walking() {
        //direction: -1: left 1: right
        if (this.state !== "on_ground") throw `Only activate walking when on_ground!`
        this.sub_state = "walking"
        this.anim_counter = 0
        this.anim_frame = this.request_start_walking_frame(this.anim_frame)
    }

/*

    handle_walking(info) {
        this.anim_counter += this.anim_speed
        if (this.anim_counter >= 100) {
            this.anim_counter = 0
            this.anim_frame = 1 - this.anim_frame
        }
        this.x += this.speed * this.direction
    }
*/

/*
    stop_walking() {
        this.sub_state = "standing"
        this.anim_frame = this.request_standing_frame(this.anim_frame)
        this.state = "on_ground"
    }
  */      

    handle_falling(info) {

                    //if (!this.is_player) return //testing only

        if (this.gravity_disabled) return

        this.accel += this.falling_acceleration
        this.speed_y += this.accel 

        let max = this.max_falling_speed
        //gravity
        if (this.speed_y > max) this.speed_y = max

        let actual_falling_speed = Math.round(this.speed_y)
        if (actual_falling_speed) this.y += actual_falling_speed
        this.last_speed_y = actual_falling_speed

        //if (debug.log_player_state && this.is_player) console.log("is falling", this.speed_y)
        /*if (this.is_player) {
            console.log("FALLING, PLAYER POS", this.y)
        }*/
        //kira 

        //console.log(this.collision_type)
        let prev_colliding = false
        if (!this.is_player) {
            prev_colliding = true
        } else {
            //for player:
            for (let i = 1; i < 7; i++) {
                if (this.pre_input_collision_state.entity_vs_map["bottom" + i].collides) {
                    prev_colliding = true
                    break
                }
            }    
        }


        if (info.tile_below &&
            prev_colliding
            //&& this.collision_type !== "left-right"
            ) {
            this.land_on_ground(info)
        }
    }

    //kira

    bump_head() {
        console.log("bump head, start falling")
        this.state = "falling"
    }

    handle_jumping(info) {

        let coll = info.collision_state

        if (this.is_player && this.current_ladder) {
            this.disattach_from_ladder()
        }

        //console.log(this.collision_type)
        let prev_colliding = false
        if (!this.is_player) {
            prev_colliding = true
        } else {
            for (let i = 1; i < 7; i++) {
                if (this.pre_input_collision_state.entity_vs_map["top" + i].collides) {
                    prev_colliding = true
                    break
                }
            }    
        }

        if (info.tile_above && prev_colliding) this.bump_head()

        this.jump_speed_temp += this.jump_acc


        let actual_jump_speed_temp = Math.round(this.jump_speed_temp)
        this.y -= actual_jump_speed_temp

        this.jump_energy -= 1
        if (this.jump_energy <= 0) {
            this.stop_jumping()
            return
        }
        //if (debug.log_player_state && this.is_player) console.log("keep jumping")
    }

    handle_on_ground(info) {
        let coll = info.collision_state
        let ce = coll.entity_vs_map

        /*let slope = false
        for (let d of ["left", "right"]) {
            //if (ce[d + 4].collides) slope = true
        }*/

        if (!info.tile_below) {
            this.start_falling()
            return
        }

        if (!this.dont_walk_now && this.walking) {
            this.anim_counter += this.anim_speed
            if (this.anim_counter >= 100) { //we can do it
                //like this, because mainloop
                //already takes care of time
                this.anim_counter = 0
                this.anim_frame = this.request_next_walking_frame(this.anim_frame)
            }
        } else {
            this.anim_frame = this.request_standing_frame(this.anim_frame)
        }
    }

    start_jumping() {
        this.state = "jumping"
        this.jump_energy = this.jump_power
        this.jump_acc = this.jump_acceleration
        this.jump_speed_temp = this.jump_speed
        if (debug.log_player_state && this.is_player) console.log("start jumping")

        let x = one_of(["jump1", "jump2"])
        sound[x].volume = 0.1
        sound[x].play()

    }


    stop_jumping() {
        this.state = "falling"
        if (debug.log_player_state && this.is_player) console.log("stop jumping -> falling")
    }


    handle_common_movement(info) {
        //handles jumping, falling and collisions
        //for player in the first place!!!
        //but other entities can call this, too (theoretically, but do they?)

        let coll = info.collision_state

        let ce = coll.entity_vs_map

        let do_collide = false

        this.collision_type = false
        this.collision_sub_type = false

        for (let i = 0; i < 2; i++) {
            let d = "right"
            if (i === 0) d = "left"
            if (
                    ce[d + 1].collides ||
                    ce[d + 2].collides ||
                    ce[d + 3].collides ||
                    ce[d + 4].collides

                ) {
                do_collide = true
                this.collision_type = "left-right"
                this.collision_sub_type = d
            }
        }

        if (do_collide) {
            if (this.last_mov_x) {
                this.x -= this.last_mov_x 
                //log("collide left/right") //to do todo:
                //why does this trigger all the time
                //all of a sudden and why doesn't it affect
                //the movement at at all, what is this?
                //(is this still a relevant bug??? context?)
            }
        }
    
        // get info.tile_below info.tile_above: after handling left
        // right collision! NO
        /* we need to get the state of bottom1 etc, collides after
        right left handling. kira */
        
        info.tile_below = (
            ce.bottom1.collides ||
            ce.bottom2.collides ||
            ce.bottom3.collides ||
            ce.bottom4.collides ||
            ce.bottom5.collides ||
            ce.bottom6.collides     
            )

        info.tile_above = (
            ce.top1.collides ||
            ce.top2.collides ||
            ce.top3.collides ||
            ce.top4.collides ||
            ce.top5.collides ||
            ce.top6.collides
            
            )

        //log(`below: ${info.tile_below} / above:  ${info.tile_above}`)

        //if (this.is_player) console.log("PLAYER STATE", this.state)

        /*
        let rcoll = false

        for (let ent of info.coll.entity_vs_entity) {
            if (ent.is_rock) {
                rcoll = true
                break
            }
        }
        */




        
        if ( this.state === "on_ground" ) {
            this.handle_on_ground(info)
        } else if ( this.state === "jumping" ) {
            this.handle_jumping(info)
        } else if ( this.state === "falling" ) {
            this.handle_falling(info)
        }


    }


    render(elapsed, drawing_context, offset_x, offset_y, modifiers = {}) {

        if (this.no_render) return

        if (!this.image) throw `Entity has no image.`

        let dir = ""
        if (this.direction === 1) {
            dir = "r"
        }

        if (this.same_image_both_directions) dir = ""

        let nr = this.anim_frame

        let modifier = ""

        if (this.current_ladder) {
            modifier = "ladder"
        }

        let img_name = this.image + modifier + nr + dir

        if (modifiers.time_frozen) {
            drawing_context.raw_ctx.globalAlpha = 0.4
        } else {
            drawing_context.raw_ctx.globalAlpha = 1
        }

        if (window.nazi && this.is_player) console.log("rendering player at", this.x, this.y,
          "diff", this.y - this.test_only_last_y)

        this.test_only_last_y = this.y

        drawing_context.draw_image(img_name, this.x +
            offset_x, this.y + offset_y)

        if (debug.show_collision_boxes) {
            this.show_collision_box(drawing_context, offset_x, offset_y)
            this.draw_collision_dots(drawing_context, offset_x, offset_y)
        }
        
    }

    show_collision_box(drawing_context, offset_x, offset_y) {
        let ent = this
        let lastf = drawing_context.raw_ctx.fillStyle
        drawing_context.raw_ctx.fillStyle = "rgba(255, 0, 0, 0.4)"
        drawing_context.raw_ctx.fillRect(
            ent.x + offset_x + ent.collision_box.x,
            ent.y + offset_y + ent.collision_box.y,
            ent.collision_box.w,
            ent.collision_box.h)
        drawing_context.raw_ctx.fillStyle = lastf
    }


    draw_collision_dots(drawing_context, offset_x = 0, offset_y = 0) {
        let tf = drawing_context.raw_ctx.fillStyle
        drawing_context.raw_ctx.fillStyle = "#F0F"
        for (let dot of this.collision_dots) {
            let bx, by
            let r = this.get_dot_position_on_screen(dot)
            bx = r.x + offset_x
            by = r.y + offset_y

            //console.log(1333, dot.x,dot.y)
            //console.log(bx, by) monster
            //if (!this.is_player) console.log(r)
            drawing_context.raw_ctx.fillRect(bx - 1, by - 1, 3, 3)

            let t = this.get_dot_position_on_map(dot)

            let a = this.level.get_tile_at_position(t.x, t.y)

            if (dot.id === "top1" && this.is_player) {
                //console.log(a.x, a.y)
                debug.highlight_tile_x = a.x
                debug.highlight_tile_y = a.y
            }
        }
        drawing_context.raw_ctx.fillStyle = tf
    }

    get_collision_box_rect() {
        let r = {}
        r.left = this.x + this.collision_box.x
        r.right = r.left + this.collision_box.w
        r.top = this.y + this.collision_box.y
        r.bottom = r.top + this.collision_box.h       
        return r
    }

    
    collision_boxes_overlap(e2) {
        let m = this.get_collision_box_rect()
        let p = e2.get_collision_box_rect()
        return (
            m.left <= p.right &&
            p.left <= m.right &&
            m.top <= p.bottom &&
            p.top <= m.bottom
            )
    }



}



class TechLever extends Entity {
    constructor () {
        super()
        this.anim_speed = 0
        this.image = "lever"
        this.direction = -1
        this.anim_frame = 0
        this.is_lever = true
        this.activated = false
    }

    on_player_press(info) {
        let x = "lever"
        sound[x].volume = 0.1
        sound[x].play()
        this.activated = !this.activated
        if (this.activated) {
            this.anim_frame = 1
        } else {
            this.anim_frame = 0
        }
        let bridge = this.points_to_bridge
        if (bridge === "useless_lever") {
            console.log("useless lever")                 
            return
        }
        bridge.switch(info.map)
    }
}




class TechBridge extends Entity {
    constructor () {
        super()
        this.no_render = true //is invisible at first
        this.image = false //is invisible at first
        this.anim_speed = 0
        this.direction = -1
        this.anim_frame = 0
        this.is_bridge = true
        this.activated = false
    }

    switch(map) {
        if (this.activated) {
            this.deactivate(map)
        } else {
            this.activate(map)
        }
    }

    activate(map) {
        console.log(map)
        this.change_map(map, -1, 5)
        this.activated = true
    }

    deactivate(map) {
        this.change_map(map, 5, -1)
        this.activated = false
    }

    change_map(map, change, target) {
        //build bridge:
        let y = this.created_at_tile.y
        for (let x = this.created_at_tile.x; x < 1_000_000; x++) {
            let v = map.get(x, y)
            if (v === change) {
                map.set(x, y, target)
            } else {
                break
            }
        }
    }
}


class TechBridgeClosed extends TechBridge {
    on_creation (x, y, map) {
        console.log(this, x, y, map)
        this.activated = true
        this.change_map(map, -1, 5)
    }

}



class Monster extends Entity {
    //all entities except for the player
    //are of class Monster
    
    update(info) {
        //first handle movement and individual stuff
        //then call super.handle_common_movement(info)!
        if (!this.dont_walk_now) {
            this.x += this.speed * this.direction
            this.walking = true
            this.last_mov_x = this.speed * this.direction
        }

        super.handle_common_movement(info)
    }

}


class Bullet extends Entity {
    /* stuff that is more or less
    a bullet.
    currently destroyed by lifetime
    not by exit screen, because
    it's easier than to mess around
    with camera viewport
    */
    constructor(x, y) {
        super()
        this.same_image_both_directions = true
        this.image = "bomb"
        this.direction = -1
        this.collision_box = { x: 4, y: 4, w: 24, h: 22 }      
        let offx = 10
        let offy = 10
        let tx = 10
        let ty = 10
        this.collision_dots = [
            { id:"top1", x: offx, y: offy, },
            { id:"top2", x: offx + tx, y: offy, },
            { id:"top3", x: offx, y: offy + ty, },
            { id:"top4", x: offx + tx, y: offy + ty, },
        ]
        this.x = x
        this.y = y
        this.max_life_time = 5000 //subclasses
            //can change this
        this._creation = performance.now() 
    }
    
    update(info) {
        if ( this.destroy_if_old(info) ) return
        this.move(info)
        if (
            info.coll.entity_vs_map.top1.collides
            ||
            info.coll.entity_vs_map.top2.collides
            ||
            info.coll.entity_vs_map.top3.collides
            ||
            info.coll.entity_vs_map.top4.collides
            )
        {
            this.on_collide_with_map(info)
        } else if (info.coll.entity_vs_entity.length > 0) {
            //take fist entity. if they overlap,
            //there is probably little point
            //into distinguishing - well for some cases
            //there might be, but if we really do logic
            //like that we will adapt the code
            this.on_collide_with_entity(info, info.coll.entity_vs_entity[0])
        }
    }

    on_collide_with_entity(info, entity) {
        //subclasses can custom define this
    }

    on_collide_with_map(info) {
        //subclasses can custom define this
    }

    move(info) {
        //subclasses can custom define this
        this.x += 2 * this.direction
    }

    destroy_if_old() {
        let time = performance.now()
        let elapsed = time - this._creation
        if (elapsed > this.max_life_time) {
            this.destroy()
            return true
        }
        return false
    }

}

class BombBullet extends Bullet {
    constructor(x, y) {
        super(x, y)
        this.is_bomb_bullet = true
        this.curve_power = -10
    }

    move(info) {
        this.x += 3 * this.direction
        this.y += this.curve_power
        this.curve_power += 0.5        
    }

    //hickups in bullet seem to come entirely from entity collisions
    //i don't know what fucking invisible entity does this??????
    //sometimes a bullet just disappears shortly after shooting it


    on_collide_with_entity(info, entity) {

        //return //testing

        return //currently totally disabled


        //sometimes bullets collide with other bullets!
        //i still don't really get how on earth a bullet can catch up to another
        //bullet when they all have the same speed, but they definitely
        //DO collide. so we just ignore these collisions
        /*
        if (
            entity.is_bomb_bullet ||
            entity.is_ladder ||
            entity.is_coin ||
            entity.is_explosion

            ) {
            return
        }

        if (entity.is_player) {
            //you can shoot and immediately run into your own bullet
            //making it explode
            //(if bullet is slow enough, at least) / this prevents that
            return
        }

        console.log("BOMB BULLET COLLIDED WITH ENTITY:", entity)
        this.explode(info)*/
    }

    on_collide_with_map(info) {
        this.explode(info)
    }

    explode(info) {
        let exp = info.level.create_entity(Explosion, 
            this.x, this.y)
        exp.x = this.x - 64
        exp.y = this.y - 64
        console.log(221,exp, this.x)
        

        let map = info.level.map
        let tile = info.level.get_tile_at_position(this.x, this.y)
        console.log(tile)

        let func = ( (x, y, value) => {
            map.set(x, y, -1)
        })
        let sx = tile.x
        let sy = tile.y
        let radius = 4
        map.circle_loop(func, sx, sy, radius * radius)

        this.destroy()
    }
}


class Rock extends Monster {
    constructor() {
        super()
        this.is_rock = true
        this.image = "rock"
        this.direction = -1
        this.anim_frame = 0
        this.speed = 0
        this.last_y_mov = 0
        this.collision_box = { x: 4, y: 4, w: 28, h: 22 }
        this.collision_dots = [
            { id: "bottom1", x: 4, y: 26 },
            { id: "bottom2", x: 18, y: 26 },
            { id: "bottom3", x: 28, y: 26 },
            { id: "left1", x: 4, y: 9 },
            { id: "left2", x: 4, y: 13 },
            { id: "right1", x: 28, y: 9 },
            { id: "right2", x: 28, y: 13 },

        ]
    }

    update(info) {
        let speed = 10
        this.y += speed
        this.last_y_mov = speed
        
        if (
            info.coll.entity_vs_map.bottom1.collides
            ||
            info.coll.entity_vs_map.bottom2.collides
            ||
            info.coll.entity_vs_map.bottom3.collides
            )
        {
            this.y -= this.last_y_mov
        }


        if (info.coll.entity_vs_entity.includes(info.player)) {
            //console.log(333, info.player)
            let delta = info.player.direction * info.player.speed
            let block = false
            
            if ( delta < 0 && (info.coll.entity_vs_map.left1.collides
                 || info.coll.entity_vs_map.left2.collides) ) {
                block = true
            }
            

            if ( delta > 0 && (info.coll.entity_vs_map.right1.collides ||
                    info.coll.entity_vs_map.right2.collides) ) {
                block = true
            }

            if (!block) {
                this.x += delta
            } else {
                info.player.x -= info.player.speed * info.player.direction
            }

        
        }


    }

}

class Explosion extends Monster{
    constructor() {
        super()
        this.image = "explode"
        this.direction = -1
        this.anim_frame = 0
        this.speed = 0
        console.log(999, this) 
        this.collision_box = { x: 4, y: 4, w: 24, h: 22 }   
        this.counter = 0
        this.blink_speed = 5
        this.is_explosion = true
        this.time = 5
    }

    update() {
        this.counter ++
        if (this.counter >= this.blink_speed) {
            this.counter = 0
            this.anim_frame = 1 - this.anim_frame
        }
        this.time --
        if (this.time <= 0) {
            this.destroy()
        }
    }

}



class Coin extends Entity {
    constructor() {
        super()
        this.image = "coin"
        this.direction = -1
        this.collision_box = { x: 4, y: 4, w: 24, h: 22 }
        this.collision_dots = []
        this.is_coin = true
    }
    update(info) {
        let x = info.coll.entity_vs_entity.includes(info.player)
        if (x) {
            info.player.score += 1
            sound["coin"].volume = 0.1
            sound["coin"].play()
            this.destroy()
        }
    }
}


class Ladder extends Entity {
    constructor() {
        super()
        this.image = "ladder"
        this.is_ladder = true
        this.direction = -1
        this.collision_box = { x: 0, y: 0, w: 16, h: 128 } //to do todo adjust
        this.collision_dots = []
    }
}




class Runner extends Monster {
    constructor() {
        super()

        //SETTINGS (all of these variables can be changed
        //to tweak the behavior! Just inherit from this
        //and tweak the variables to create a new monster type

        this.speed = 2
        this.image = "runner"
        this.walking = false


        this.slow_walk_speed = 0.5
        this.slow_walk_anim_speed = 5
        this.running_speed = 5
        this.running_anim_speed = 10

        this.running_time_min = 60
        this.running_time_max = 80

        this.distance_x_for_charge = 200
        this.distance_y_for_charge = 8

        this.look_around_time_min = 150 //150
        this.look_around_time_max = 170 //170
        
        this.standing_time_min = 100 //100
        this.standing_time_max = 120 //120

        this.walk_around_time_min = 100 //100
        this.walk_around_time_max = 120 //120

        this.has_aggressive_run = true



        this.stomping_feet_time = 100 // 100

        this.wait_till_angry_again_time = 300
        this.wait_till_angry_again_time_on_side_switch = 25

        this.has_jumping = false
        this.jump_cooldown_min = 100
        this.jump_cooldown_max = 200
        this.jump_power_min = 5
        this.jump_power_max = 8
        this.jump_power_decrease_by_px = 1 //better to keep this integer
        this.jump_power_decrease_time = 4
        this.slow_walk_anim_speed = 20
        this.slow_walk_speed = 2


        this.has_different_x_speed_while_jumping = false
        this.x_speed_while_jumping = 0

        //NON-SETTINGS


        this.jump_acc = 0

        this.direction = 1
        this.count = 0
        this.status = 0
        this.anim_frame = 0


        this.wait_till_angry_again = this.wait_till_angry_again_time
        
        this.collision_box = { x: 0, y: 12, w: 32, h: 20 }

        this.wait_till_next_jump = 0 //leave at 0, not a setting.
            //use jump_colldown_min/max instead


        //note how the bottom dots are directly
        //beneath the left right dots
        //that way if a monster falls off an edge
        //it cannot land inside a wall with its
        //left/right collision dot

        this.collision_dots = [
            { id: "bottom3", x: 24, y: 35 },
            { id: "bottom2", x: 15, y: 35 },
            { id: "bottom1", x: 6, y: 35 },

            { id: "right1", x: 24, y: 23 },
            { id: "left1", x: 6, y: 23 },

            { id: "top3", x: 24, y: 6 },
            { id: "top2", x: 15, y: 3 },
            { id: "top1", x: 6, y: 6 },
        ]
    }

    request_start_walking_frame(frame) {
        if (this.angry) return 3
        return 5
    }

    request_next_walking_frame(frame) {
        if (frame === 2) return 3
        if (frame === 3) return 2
        if (frame === 5) return 4
        if (frame === 4) return 5
        return 4
    }

    request_standing_frame(frame) {
        if (this.angry) return frame
        return 0
    }

    update(info) {

        //first handle stuff that is specific to this monster
        //then call super.update! then we can do specific stuff again

        let tile_below =
        (
            info.coll.entity_vs_map.bottom1.collides ||
            info.coll.entity_vs_map.bottom2.collides ||
            info.coll.entity_vs_map.bottom3.collides ||
            info.coll.entity_vs_map.bottom4.collides ||
            info.coll.entity_vs_map.bottom5.collides ||
            info.coll.entity_vs_map.bottom6.collides
            
        )        
        
        let tile_above =
        (
            info.coll.entity_vs_map.top1.collides ||
            info.coll.entity_vs_map.top2.collides ||
            info.coll.entity_vs_map.top3.collides ||
            info.coll.entity_vs_map.top4.collides ||
            info.coll.entity_vs_map.top5.collides ||
            info.coll.entity_vs_map.top6.collides
            
        )

        this.count --

        if(this.count <= 0) {
            this.status ++
            if (this.status >= 7) {
                this.status = 1
                this.wait_till_angry_again = this.wait_till_angry_again_time
            }
            if (this.status === 1) {
                //standing
                this.speed = 0 //x-speed
                this.running = false
                this.jumping = false
                this.angry = 0
                this.anim_speed = this.slow_walk_anim_speed
                this.speed = this.slow_walk_speed
                this.walking = false
                this.dont_walk_now = true
                this.jump_acc = 0
                this.count = rnd(this.standing_time_min, this.standing_time_max)
            } else if (this.status === 2) {
                //look around
                this.direction *= -1
                this.count = rnd(this.look_around_time_min, this.look_around_time_max)
                if (rnd(1,100) <= 30) this.status --
            } else if (this.status === 3) {
                //start walking around a bit
                this.dont_walk_now = false
                this.walking = true
                this.count = rnd(this.walk_around_time_min,
                    this.walk_around_time_max)
                this.status = 0 //status 0 is walking
            } else if (this.status === 5) {
                //starts getting angry //stomping feet
                //turn towards player:
                this.direction = (this.x < info.player.x + 15) ? 1 : -1 
                this.count = this.stomping_feet_time
                this.dont_walk_now = true
                this.walking = false
                this.angry = true
            }  else if(this.status === 6) {
                //running
                this.running = true
                this.count = rnd(this.running_time_min, this.running_time_max)
                this.walking = true
                this.dont_walk_now = false
                this.anim_speed = this.running_anim_speed
                this.speed = this.running_speed
            }
        }


        if (this.wait_till_angry_again > 0) this.wait_till_angry_again--

        if ( this.has_aggressive_run && this.status < 5 &&
                this.wait_till_angry_again <= 0 &&
                !this.angry 
                && Math.abs(this.x - info.player.x) <= this.distance_x_for_charge
                && Math.abs(this.y - info.player.y) <= this.distance_y_for_charge
            
            ) {
                //get angry
                this.status = 4
                this.count = 0
                this.wcount = 0
                this.anim_frame = 3
        } else if (this.status === 0 && this.has_jumping) {
            //start jumping
            if (tile_below) {
                cls

        
                if (this.wait_till_next_jump > 0) {
                    this.wait_till_next_jump--
                    //console.log("waiting for jump", this.wait_till_next_jump)
                } else {
                //start jumping:
                    log("start jump")
                    let x = one_of(["jump1", "jump2"])
                    sound[x].volume = 0.1
                    sound[x].play()
                    this.status = 10
                    this.anim_speed = 5
                    this.jump_acc = rnd(this.jump_power_min, this.jump_power_max)
                    this.y -= 0
                    this.gravity_disabled = true
                    this.jmp_pow_decr_time_c = this.jump_power_decrease_time
                    //console.log("start jumping")
                    if (this.has_different_x_speed_while_jumping) {
                        this.speed = this.x_speed_while_jumping
                    }
                }
            }
        }

        
        if (this.status === 10) {

            this.count = 1000 //block countdown
            this.jmp_pow_decr_time_c --

            if (this.jmp_pow_decr_time_c <= 0) {
                this.jmp_pow_decr_time_c = this.jump_power_decrease_time
                this.jump_acc -= this.jump_power_decrease_by_px
            }
            this.last_fall_yy = this.jump_acc
            this.y -= this.jump_acc

            if (this.jump_acc <= 0) {
                if (tile_below) {
                    //land on ground:
                    if (this.has_different_x_speed_while_jumping) {
                        this.speed = 0
                    }
                    this.gravity_disabled = false
                    this.status = 0
                    //console.log("LANDING ON GROUND")
                    this.y += this.last_fall_yy
                    this.wait_till_next_jump = rnd(
                        this.jump_cooldown_min, this.jump_cooldown_max)
                }
            } else {
                if (tile_above) {
                    //bump head
                    this.jump_acc = 0
                    this.y += this.last_fall_yy
                    this.speed = 0 //x-speed
                }
            }
        }


        if (this.status === 5) {
            //walking on spot, preparing to run
            this.anim_speed = 5
            this.wcount++
            if (this.wcount >= 20) {
                this.wcount = 0
                if (this.anim_frame === 3) {
                    this.anim_frame = 2
                } else {
                    this.anim_frame = 3
                }
            }

            if (
                this.direction === -1 && info.player.x > this.x
                ||
                this.direction === 1 && info.player.x < this.x
                ) {
                //abort if player switches sides
                this.count = 0
                this.status = 1
                this.angry = false
                this.wait_till_angry_again =
                    this.wait_till_angry_again_time_on_side_switch
                //console.log("abort")
            }

        }

        super.update(info)


        let c = info.entity_vs_map
        if (
            (this.collision_sub_type === "left" && this.direction === -1) ||
            (this.collision_sub_type === "right" && this.direction === 1)
        )
            {
            this.direction *= -1
            let bump_off_on_collision = this.speed
            this.x += this.direction * bump_off_on_collision
        }

        if ( info.coll.collides_with_entity(info.player) ) {
            //info.player.damaged(1)
        }



    } //update

    render(elapsed, drawing_context, offset_x, offset_y, modifiers) {
        super.render(elapsed, drawing_context, offset_x, offset_y, modifiers)
    }
}


class Jumper extends Runner {
    /* a subclass of Runner:
    an enemy that jumps around, but does not charge at you.
    */
    constructor() {
        super()
        this.image = "brunner"
        
        this.has_jumping = true
        this.jump_cooldown_min = 50
        this.jump_cooldown_max = 100
        this.jump_power_min = 5
        this.jump_power_max = 8
        this.jump_power_decrease_by_px = 1
        this.jump_power_decrease_time = 4
        this.slow_walk_anim_speed = 20


        this.slow_walk_speed = 4
        this.slow_walk_anim_speed = 20

        this.look_around_time_min = 30 //150
        this.look_around_time_max = 40 //170
        
        this.standing_time_min = 20 //100
        this.standing_time_max = 20 //120

        this.walk_around_time_min = 40 //100
        this.walk_around_time_max = 150 //120
        
        this.has_aggressive_run = false //test


    }

}


class Bloogie extends Runner {
    /* An enemy that stands around
    and walks around a bit, but does not jump.
    If it sees you, it stomps its feet,
    then charges at you.
    Inherits most things from Runner,
    few stuff to set
    */
    constructor() {
        super()
        this.image = "runner"
        this.has_aggressive_run = true //test
        this.slow_walk_speed = 0.5
        this.slow_walk_anim_speed = 10
    }

    update(info) {
        super.update(info)
        if (this.status === 5) {
            sound.click.play()
        } else if (this.status === 6
            && this._last_status !== 6) {
            sound.ran.volume = 0.2
            sound.ran.play()
        }
        this._last_status = this.status
    }
}


class Marata extends Jumper {
    constructor() {
        super()
        this.has_aggressive_run = false
        this.has_jumping = false
        this.image = "marata"
        this.slow_walk_speed = 2
        //walks around, rather fast, no jump, no charge,
        //not that special. works as an enemy with
        //medium difficulty, but maybe a bit unspecial.
        //maybe every enemy should have some specialty.
        //but it's okay, I guess.
    }

    update(info) {
        super.update(info)
        if (this.status === 0) {
            //while walking:
            //sound.blip.volume = 0.03
            //if (rnd(1,100) <= 20) {
            //    sound.blip.play()
            //}
        }
        this._last_status = this.status
    }
}




class JumpCharger extends Jumper {
    /*
        A sub-class of Jumper:
    This dude jumps around like jumper,
    but he also charges at you like Charger.
    But the charging is immediate: there
    is no food-stomping phase before, so
    you cannot even prepare for it
    */
    constructor() {
        super()
        this.image = "brunner"

        this.has_aggressive_run = true
        this.stomping_feet_time = 0
        this.slow_walk_speed = 1
        this.running_speed = 4

    }
}

class Killa extends JumpCharger {
    //a mean jumpcharger. to do: fix collision dots
    constructor() {
        super()
        this.image = "killa"
    }

}


class Pumpkin extends JumpCharger {
    constructor() {
        super()

        this.total_height = 64

        this.image = "pu"
        
        this.has_jumping = false
        this.jump_cooldown_min = 550
        this.jump_cooldown_max = 700
        this.jump_power_min = 3
        this.jump_power_max = 4
        this.jump_power_decrease_by_px = 1
        this.jump_power_decrease_time = 4
        this.slow_walk_anim_speed = 20

        this.slow_walk_speed = 0.2
        this.slow_walk_anim_speed = 20

        this.running_speed = 4
        this.running_anim_speed = 20

        this.look_around_time_min = 30 //150
        this.look_around_time_max = 40 //170
        
        this.standing_time_min = 20 //100
        this.standing_time_max = 20 //120

        this.walk_around_time_min = 40 //100
        this.walk_around_time_max = 50 //120
        
        this.running_time_min = 60
        this.running_time_max = 80

        this.distance_x_for_charge = 200
        this.distance_y_for_charge = 80

        this.collision_dots = [

            { id: "bottom5", x: 56, y: 70 },

            { id: "bottom4", x: 46, y: 70 },

            { id: "bottom3", x: 32, y: 70 },

            { id: "bottom2", x: 18, y: 70 },

            { id: "bottom1", x: 4, y: 70 },
    

            { id: "right1", x: 55, y: 12 },
            { id: "right2", x: 62, y: 26 },
            { id: "right3", x: 62, y: 40 },
            { id: "right4", x: 62, y: 54 },


            { id: "left1", x: 7, y: 12 },
            { id: "left2", x: 0, y: 26 },
            { id: "left3", x: 0, y: 40 },
            { id: "left4", x: 0, y: 54 },

    
            { id: "top3", x: 40, y: 6 },
            { id: "top2", x: 28, y: 6 },
            { id: "top1", x: 16, y: 6 },
        ]
    }

    update(info) {
        super.update(info)
        if (this.status === 6) {
            //while running:
            sound.bit.volume = 0.2
            if (rnd(1,100) <= 100) {
                sound.bit.play()
            }
        }
        this._last_status = this.status
    }

}



class LazyJumper extends Jumper {
    /*
        A sub-class of Jumper:
        This is a monster that stands still and jump up
        and down. this can be used for obstacles
        or whatever. it does not move.
        it has walking animation, though
    
    */
    constructor() {
        super()
        this.image = "runner"

        this.has_aggressive_run = false
        this.has_jumping = true
        this.jump_cooldown_min = 50
        this.jump_cooldown_max = 100
        this.jump_power_min = 5
        this.jump_power_max = 8
        this.jump_power_decrease_by_px = 1
        this.jump_power_decrease_time = 4

        this.slow_walk_speed = 0
        this.slow_walk_anim_speed = 20

        this.look_around_time_min = 30 //150
        this.look_around_time_max = 40 //170
        
        this.standing_time_min = 20 //100
        this.standing_time_max = 20 //120

        this.walk_around_time_min = 40 //100
        this.walk_around_time_max = 150 //120

    }
}



class Sinner extends LazyJumper {
    constructor() {
        /* 
        
        moves only through jumping.
        chills in between. a bit like the frog
        from spelunky, but does not target the player,
        instead jumps in a random direction
        */


        super()
        this.image = "brunner"  
        this.jump_cooldown_min = 200
        this.jump_cooldown_max = 600

        this.jump_power_min = 2
        this.jump_power_max = 6
        this.jump_power_decrease_by_px = 1 //better to keep this integer
        this.jump_power_decrease_time = 4

        this.has_different_x_speed_while_jumping = true
        this.x_speed_while_jumping = 3
        this.collision_dots.push({ id: "right2", x: 40, y: 23 })
        this.collision_dots.push({ id: "left2", x: -10, y: 23 })
        
    }

    update(info) {
        super.update(info)

    }
}



class Hopper extends LazyJumper {
    constructor() {
        /* 
grasshopper
        */


        super()
        this.image = "hop"
        this.jump_cooldown_min = 100
        this.jump_cooldown_max = 200

        this.jump_power_min = 2
        this.jump_power_max = 6
        this.jump_power_decrease_by_px = 1 //better to keep this integer
        this.jump_power_decrease_time = 4

        this.has_different_x_speed_while_jumping = true
        this.x_speed_while_jumping = 3
        this.collision_dots.push({ id: "right2", x: 40, y: 23 })
        this.collision_dots.push({ id: "left2", x: -10, y: 23 })
        
    }

    update(info) {
        super.update(info)

    }
}


class SpikeBall extends LazyJumper {
    constructor() {
        super()
        this.image = "spikeball"
    }
}




class Infector extends Jumper {
    constructor() {
        super()
        this.has_aggressive_run = false
        this.has_jumping = false
        this.image = "greeno"
        this.slow_walk_speed = 0.5

        this.collision_dots.push(
            { id: "infector", x: 15, y: 37 },
        )        
    }

    update(info) {
        //infects ground he is walking on:
        //infector dot is used for that
        super.update(info)
        let b = info.coll.entity_vs_map.infector
        if (b.collides) {
            let x = b.tile_x
            let y = b.tile_y
            let map = this.level.map
            let rt = map.get(x, y)
            if (rt !== 3 && rt !== 4) {
                map.set( x, y, rnd(3, 4) )
            }
        }
    }

}



class Kudo extends Monster {
    constructor() {
        super()
        this.speed = 0.5
        this.image = "kudo"
        this.walking = true
        this.direction = 1
        this.refract = 0
        this.x = 200
        this.y = 250
        this.collision_box = { x: 0, y: 12, w: 32, h: 20 }
        this.collision_dots = [
            { id: "bottom1", x: 12, y: 35 },
            { id: "right1", x: 36, y: 20 },
            { id: "left1", x: -3, y: 20 },
        ]
    }

    update(info) {
        //first handle stuff that is specific to this monster
        //then call super.update! then we can do specific stuff again

        if (this.refract > 0) this.refract--

        if (this.refract === 0) {
            if ( Math.abs(this.x - info.player.x) <= 100 ) {
                if (this.x < info.player.x + 15) {
                    this.direction = 1
                    this.refract = 100
                } else {
                    this.direction = -1
                    this.refract = 100
                }
            }
        }

        super.update(info)

        let c = info.entity_vs_map
        if (
            (this.collision_sub_type === "left" && this.direction === -1) ||
            (this.collision_sub_type === "right" && this.direction === 1)
        )
            {
            this.direction *= -1
            this.x += this.direction * 2
            this.refract = 100
        }

        if ( info.coll.collides_with_entity(info.player) ) {
            //info.player.damaged(1)
        }

        //if ( info.coll.collides_with_entity(info.player) ) {
        //    info.player.x += 10 * this.direction
        //}

        //console.log()

        //annapurna
        //let xx = info.collision_state.entity_vs_entity
        //console.log(xx)


    }

    render(elapsed, drawing_context, offset_x, offset_y) {
        super.render(elapsed, drawing_context, offset_x, offset_y)
    }
}


class Player extends Entity {
    constructor() {
        super()

        this.min_speed_to_destroy_sand_tile = 4
        this.destroys_sand_tiles = true //false
        
        this.has_time_freeze_bubble = false //works.
            //freezes enemies farther away from you.
        this.time_freeze_bubble_dist = 150

        //SETTINGS:
        this.jump_acceleration = -0.5
        this.jump_power = 9
        this.jump_speed = 12

        this.current_ladder = false
        this.ladder_anim_speed = 8 //higher = slower!

        this.is_player = true
        this.speed = 4.5
        this.anim_speed = 14
        this.image = "anselmo"
        this.player = true
        this.x = 40
        this.y = 470
        this.collision_box = { x: 8, y: 0, w: 12, h: 32 }
        this.collision_dots = [

            { id: "bottom1", x: 8, y: 33 },
            { id: "bottom2", x: 13, y: 33 },
            { id: "bottom3", x: 19,y: 33, }, 

            { id: "top1", x: 10, y: -12, },
            { id: "top2", x: 18, y: -12, },
            { id: "top3", x: 10, y: -4, },
            { id: "top4", x: 18, y: -4, },

            //for collision / no-movement:
            { id: "left1", x: 8, y: 6, },
            { id: "left2", x: 8, y: 13, },        
            { id: "left3", x: 8, y: 20, },           
            { id: "left4", x: 8, y: 27, },

            { id: "right1", x: 19, y: 6, },
            { id: "right2", x: 19, y: 13, },        
            { id: "right3", x: 19, y: 20, },           
            { id: "right4", x: 19, y: 27, },


            //for walking up slopes:

            //{ id: "sloper", x: 14, y: 28, },
            

            
        ]

        //NON-SETTINGS:

        this.score = 0
        this.anim_frame_count = 0

    }

    //ce.bottom1.collides ||
    //ce.bottom2.collides     

    update(info) {

        if (debug.god_mode) {
            return
        }

        if (this.current_ladder) {
            this.gravity_disabled = true
            this.x = this.current_ladder.x - 6 
        }

        if (this.shoot_input) {
            this.shoot(info)
        }


        this.only_test_last_y = this.y

        this.handle_common_movement(info)

        this.handle_ladder(info)

        this.handle_lever(info)


        /*if (this.state === "on_ground") {
          this.handle_player_standing_on_ground(info)
        }*/

        if (window.nazi) console.log("updating player at", this.x, this.y, "diff", this.y - this.only_test_last_y)



    }


    //handle_player_standing_on_ground(info) {
      //this function is only for the player (unlike handle on ground)
      
    //}

    shoot(info) {
        let dist = 0
        let off_y = -20
        let dir = this.direction
        let bullet = info.level.create_entity(BombBullet, 
            this.x + dir * dist, this.y + off_y)  
        bullet.direction = dir
    }

    stop_walking() {
        this.anim_frame = 0
        this.anim_counter = 0
        this.walking = false
        this.last_mov_x = 0
    }

    handle_lever(info) {
        if (
            info.keys.key_just_pressed_down.up
            ) {
                let ents = info.coll.entity_vs_entity.filter(n => n.is_lever)
                if (ents.length) {
                    let lever = ents[0]
                    let x = "lever"
                    lever.on_player_press(info)
                }
        }
    }

    disattach_from_ladder() {
        this.current_ladder = false
        this.gravity_disabled = false
        //maybe play sound
    }

    handle_ladder(info) {

        //to do: make ladder less wide auto-center
        //player once they grab ladder (shouldn't look too bad,
        //if ladder is not that wide), disallow left /right on ladder
        //and allow jumping from ladder

        if (this.current_ladder) {
            //check if still touching it,
            //if not, always disattach:
            let x = info.coll.entity_vs_entity.includes(this.current_ladder)
            if (!x) {
                this.disattach_from_ladder()
                return
            }
        }

        //handle up and down keys, both 
        //if you are already arrached and if you are not:
        let x = info.keys.key_down.up
        let x2 = info.keys.key_down.down
        if (x || x2) {
            //check if touching ladder
            let target = false
            let a = info.coll.entity_vs_entity
            //console.log(a)
            for (let item of a) {
                if (item.is_ladder) {
                    target = item
                    break
                }
            }

            if (!this.current_ladder) {
                //start grapping ladder
                this.current_ladder = target
                this.ladder_anim_count = 0
                this.anim_frame = 0
            } else {
                //is already on ladder, climb up and down:
                let sp = 2
                if (x) sp *= -1
                this.y += sp
                this.ladder_anim_count ++
                if(this.ladder_anim_count >= this.ladder_anim_speed) {
                    this.ladder_anim_count = 0
                    if (this.anim_frame === 1) {
                        this.anim_frame = 0
                    } else {
                        this.anim_frame = 1
                    }
                }
                console.log("climb")
            }

        }
    }


    handle_input(keys) {

        //handle player input

        if (debug.god_mode) {
            let s = 30
            if (keys.key_down.up) {
                this.y -= s
            }
            if (keys.key_down.down) {
                this.y += s
            }
            if (keys.key_down.right) {
                this.x += s
                this.direction = 1
            }
            if (keys.key_down.left) {
                this.x -= s
                this.direction = -1
            }
            return
        }


        if (keys.key_down.left) {
            this.x -= this.speed
            this.walking = true
            this.last_mov_x = -this.speed
            this.direction = -1
        }

        if (keys.key_down.right) {
            this.x += this.speed
            this.walking = true
            this.last_mov_x = this.speed
            this.direction = 1
        }

        this.shoot_input = false
        if (keys.key_just_pressed_down.shoot) {
            this.shoot_input = true
        }


        if (keys.key_just_released.left ||
            keys.key_just_released.right) {
                this.stop_walking()
        }

        if (keys.key_just_pressed_down.left ||
            keys.key_just_pressed_down.right) {
                this.anim_frame = 1
                this.anim_counter = 0
        }

        if (this.state === "jumping"
                && 
                (keys.key_just_released.jump
                    || !keys.key_down.jump
                )
                    ) {
            this.stop_jumping()
        }
        
        if (keys.key_just_pressed_down.jump) {
            if (this.state === "on_ground") {
                this.start_jumping()
            } else {
                if ( this.current_ladder ) {
                    this.start_jumping()
                }
            }
        }
        
    }



}


class GameMap extends Grid {
    //image_table should be object like so:
    /*
    {
        0: "image_name",
        1: "image_name2",
    }
    */
    constructor(w, h, tile_size, image_table, level) {

        super(w, h, 0)
        this.w = w
        this.h = h
        this.tile_size = tile_size
        this.image_table = image_table
        this.level = level

        if (!this.level) throw `No level passed`
    }




/*
    draw_circle(func, sx, sy, radius) {
        let func = ( (x, y, value) => {
            this.set(x, y, 2)
        })
        this.circle_loop(func, sx, sy, radius)
    }
*/
    render(drawing_context, offset_x, offset_y, start_x, start_y, end_x, end_y, mode) { //xyzzy
        //testing: draw the entire map:
        start_x = 0
        start_y = 0
        end_x = this.get_width()
        end_y = this.get_height()

        let renderOnlyOverlayTiles = false
        if (mode && mode.onlyOverlayTiles) {
            renderOnlyOverlayTiles = true
        }

        let func = (that, x, y, value) => {
            let px = offset_x + x * this.tile_size
            let py = offset_y + y * this.tile_size
            let img_name = this.image_table[value]
            if (px > drawing_context.gfx_width) return
            if (py > drawing_context.gfx_height) return
            if (px < -20) return
            if (py < -20) return            

            let renderImg = false
            if (value !== -1) renderImg = true
            if (renderOnlyOverlayTiles) { //xyzzy
                renderImg = settings.isOverlayTile(value)
            }

            if (renderImg) {
                drawing_context.draw_image(img_name, px, py)
            }

            if (this.level.app.player.has_time_freeze_bubble) {
                let rx = x * this.tile_size
                let ry = y * this.tile_size
                let a = Math.abs(rx - this.level.app.player.x)
                let b = Math.abs(ry - this.level.app.player.y)
                let c = a * a + b * b
                let dist = this.level.app.player.time_freeze_bubble_dist
                if (c > dist * dist) {
                    drawing_context.raw_ctx.fillStyle = "rgba(0,0,255, 0.5)"
                    drawing_context.raw_ctx.fillRect(px, py,
                        this.tile_size, this.tile_size)
                    //drawing_context.raw_ctx.globalAlpha = 0.4
                } else {
                    //drawing_context.raw_ctx.globalAlpha = 1.0
                }
            }

            if (debug.highlight_tile &&
                debug.highlight_tile_x === x &&
                debug.highlight_tile_y === y) {
                    let cc = drawing_context.raw_ctx
                    cc.strokeRect(px, py, this.tile_size, this.tile_size)
                    cc.strokeText(value, px, py)
                }
        }
        let tf
        if (debug.highlight_tile) {
            tf = drawing_context.raw_ctx.strokeStyle
            drawing_context.raw_ctx.strokeStyle = "rgba(0, 255, 0, 1)"
        }
        this.loop (func,  start_x, start_y, end_x, end_y)
        if (debug.highlight_tile) drawing_context.raw_ctx.strokeStyle = tf
    }

}

GameMap.game_map_from_grid = (grid, tile_size, tile_image, level) => {
    //static function
    let w = grid.get_width()
    let h = grid.get_height()
    let map = new GameMap(w, h, tile_size, tile_image, level)
    map.loop( (that, x, y, value) => {
        let v = grid.get(x, y)
        map.set(x, y, v)
    })
    return map
}



class Level {
    constructor(level_generator, parent_app) {
        this.entities = []
        this.app = parent_app
        this.entities_by_id = {}
        let img = {
            0: "tile0",
            1: "tile1",
            2: "tile2",
            3: "tile3",
            4: "tile4",
            5: "tile5",
            6: "tile6",
            7: "tile7",
            8: "tile8",
            9: "tile9",
            10: "tile10",
            11: "tile11",
            12: "tile12",
            13: "tile13",
            14: "tile14",
            15: "tile15",
            16: "tile16",
        }

        let info = {
            level: this,
            get_entities: () => this.entities,
            create_entity: this.create_entity.bind(this),
            tile_image: img,
            tile_size: 16, //8 is just too small. too many collision problems
            //not sure about that. the collision problems stem from enemy
            //code that is just incorrect. but yeah, bigger tiles might partly
            //help
        }

        level_generator.generate(info)

        this.collision_area_size = collision_area_size_setting
        this.create_collision_area(this.collision_area_size)

        this.level_generator = level_generator

    }

    get_entity_by_id(id) {
        return this.entities[id]
    }

    remove_entity(entity) {
        this.entities = this.entities.filter( n => n !== entity )
        delete this.entities_by_id[entity.id]
    }

    create_entity(tclass, x, y, map) {
        let entity = new tclass(x, y, map)
        entity.id = rnd(1, 100_000_000_000) +
            "-" + rnd(1, 100_000_000_000)
        this.entities_by_id[entity.id] = entity
        entity.level = this
        this.entities.push(entity)
        entity.created_at_tile = {x: x, y: y}
        if (entity.on_creation) entity.on_creation(x, y, map)
        return entity
    }

    get_collision_state_entity_vs_entity(entity) {

        //console.time("get_collision_state_entity_vs_entity")
        let v = this.collision_areas_temp.get(entity)

        if (!v || !v.length) return []

        let final = []

        for (let entity2 of v) {
            if ( entity.collision_boxes_overlap(entity2) ) {
                final.push(entity2)
            }
        }

        //console.log(222, entity, final)
        //console.timeEnd("get_collision_state_entity_vs_entity")
        return final
    }


    get_collision_state(entity) {        
        let o = {
            entity_vs_entity: this.get_collision_state_entity_vs_entity(entity),
            entity_vs_map: this.get_collision_state_entity_vs_map(entity),
        }
        // add some friendly helper functions:

        o.dot_collides_with_map = (dot_name) => {
            let v = o.entity_vs_map[dot_name].collides
            return v !== -1
        }

        o.collides_with_entity = (entity2) => {
            return o.entity_vs_entity.includes(entity2)
        }

        return o
    }



    get_tile_at_position(px, py) {
        //position in pixels -> returns tile_x, tile_y, tile_value
        //get_dot_position_on_screen
        //get_dot_position_on_map
        let tx = Math.ceil(px / this.map.tile_size) - 1
        let ty = Math.ceil(py / this.map.tile_size) - 1
        let v = this.map.get(tx, ty, out_of_bounds_x, out_of_bounds_y)
        return {
            x: tx,
            y: ty,
            tile: v
        }
    }

    doesTileCollide(tileValue) {
        return settings.doesTileCollide(tileValue)
    }

    get_collision_state_entity_vs_map(entity) {
        /*returns an object like this:
            collision_dot_id: {tile: value of tile, dot: colliding dot)
            the dot is on or value stored in constant out_of_bounds,
            if dot is outside tilemap
            (for every collision_dot of the entity)
        */
        //console.time("get_collision_state_entity_vs_map")
        let state = {}
        for (let dot of entity.collision_dots) {
            if (!allowed_collision_ids.has(dot.id)) {
                throw `${dot.id}: not a valid collision dot id.
                Please add this value to the Set allowed_collision_ids.`
            }
            let x = entity.x + dot.x
            let y = entity.y + dot.y
            //console.log(this.map.tile_size)
            let tx = Math.ceil(x / this.map.tile_size) - 1
            let ty = Math.ceil(y / this.map.tile_size) - 1
            let t_out_of_bounds_x = out_of_bounds_x
            let t_out_of_bounds_y = out_of_bounds_y
            let v = this.map.get(tx, ty, t_out_of_bounds_x, t_out_of_bounds_y)
            let rt = this.doesTileCollide(v)
            state[dot.id] = {tile: v, dot: dot, collides: rt,
                tile_x: tx, tile_y: ty}
        }

        for (let id of allowed_collision_ids_list) {
            if (!state[id]) state[id] = {collides: false, dot: {}}
        }
        //console.timeEnd("get_collision_state_entity_vs_map")
        return state
    }

    create_collision_area(area_size) {
        /*parameter:  size of area in pixels. experiment with
        this. does not need
        to be a power of 2, can be anything. different values
        will change performance */
        let x = collision_area_buffer_left + collision_area_buffer_right
        this.collision_area = new Grid (
            Math.floor( this.map.get_width() * this.map.tile_size / area_size ) + x,
            Math.floor( this.map.get_height() * this.map.tile_size / area_size ) + x,
            0)
        console.log( "map size", this.map.get_width(), "*", this.map.get_height() )
        console.log("collision area grid size", this.collision_area.get_width(),
            "*", this.collision_area.get_height(),
            " - size of an area block is:", area_size)
    }

    update_collision_areas() {

        /*
        
        This will return a JS Map like this:
        
        key: entity object -> value: array containing entities that are roughly
            in proximity
        
        key2: entity object2 ...etc.
        
        Note that the array will NOT include the entity
        itself.

        BUT ALSO note that if entity1 is in proximity to entity2, this will
        return two separate entries in the map, with entity1 key pointing
        to an array holding entity1 and entity2 and with entity2 holding
        an array with entity1 and entity2

*/
        
        let hash = {}
        let d = this.collision_area_size

        //create a hashmap of collision areas -> entities in same
            //or neighboring area
        for (let entity of this.entities) {
            let area_x = Math.floor((entity.x) / d)
            let area_y = Math.floor((entity.y) / d)
            for (let vx = -1; vx < 2; vx++) {
                for (let vy = -1; vy < 2; vy++) {
                    let acc = (area_x + vx) + "/" + (area_y + vy)
                    if (!hash[acc]) hash[acc] = []
                    hash[acc].push(entity)
                }
            }
        }

        let finalx = new Map()

        //create a map of entities -> entities in same or neighboring area
        for (let entity of this.entities) {
            let area_x = Math.floor((entity.x) / d)
            let area_y = Math.floor((entity.y) / d)
            let acc = (area_x) + "/" + (area_y)
            let entities_in_my_area = hash[acc].filter(n => n !== entity)
            //console.log(entity, "says: entities in my area: ", entities_in_my_area)
            finalx.set(entity, entities_in_my_area)
        }

        return finalx
    }


    update(elapsed, key_bank, player) {

        this.collision_areas_temp = this.update_collision_areas()
        
        player.pre_input_collision_state = this.get_collision_state(player)

        player.handle_input(key_bank)

        let cam = this.get_camera_position(player, this.app.gfx_width,
            this.app.gfx_height)
        let camera_x = cam[0]
        let camera_y = cam[1]

        let update_limit_x = app.gfx_width / 2 + general.update_tolerance_x
        let update_limit_y = app.gfx_height / 2 + general.update_tolerance_y
        
        for (let entity of this.entities) {
            //console.log("e",entity.x, entity.y)
            //console.log("p",player.x, player.y)
            //console.log("diff", player.x - entity.x, player.y - entity.y)
            let dx = Math.abs(camera_x + app.gfx_width / 2 - entity.x)
            let dy = Math.abs(camera_y + app.gfx_height / 2 - entity.y)

            if (dx > update_limit_x || dy > update_limit_y) continue

            if (player.has_time_freeze_bubble) {
                //we don't need to get the square root here;
                //instead we can check directly
                //against c. this means, of course, that
                //we must not check against distance, but against distance²
                let a = Math.abs(entity.x - player.x)
                let b = Math.abs(entity.y - player.y)
                let c = a * a + b * b
                let dist = player.time_freeze_bubble_dist
                if (c > dist * dist) continue
            }

            let info = {}
            info.level = this
            info.map = this.map
            info.player = player
            info.collision_state = this.get_collision_state(entity)
            info.coll = info.collision_state
            info.keys = key_bank
            entity.update(info, elapsed)
        }

/*
        let dx = Math.abs(camera_x + app.gfx_width / 2 - entity.x)
        let dy = Math.abs(camera_y + app.gfx_height / 2 - entity.y)
        if (dx + off <= this.app.gfx_width / 2 + general.render_tolerance_x
            &&
            dy + off <= this.app.gfx_height / 2 + general.render_tolerance_y) {
                //drawing_context.raw_ctx.strokeStyle = "#0F0"
                //drawing_context.raw_ctx.strokeText(dx +"/"+dy, entity.x + px, entity.y + py)
                entity.render(elapsed, drawing_context, px, py)
    
        }
*/
    }

    get_camera_position(player, gfx_width, gfx_height) {
        let camera_x = player.x - gfx_width / 2
        let camera_y = player.y - gfx_height / 2
        if (camera_x <= 32) camera_x = 32
        if (camera_x >= 2525) camera_x = 2525
        //let py = 1630
        //if (camera_y > py) camera_y = py
        return [camera_x, camera_y]
    }


    get_px_position_from_tile_position(tx, ty) {
        return {
            x: tx * this.map.tile_size,
            y: ty * this.map.tile_size,
        }
    }


    render(elapsed, drawing_context, player) {
        let px = 0
        let py = 0

        //console.log(camera_x, camera_y)
        let cam = this.get_camera_position(player, drawing_context.gfx_width,
            drawing_context.gfx_height)
        let camera_x = cam[0]
        let camera_y = cam[1]

        px = - camera_x
        py = - camera_y

        //loops only through tiles that are actually on screen:

        //let player_is_on_tile_x = Math.floor(player.x / this.map.tile_size)
        //let player_is_on_tile_y = Math.floor(player.y / this.map.tile_size)

        let camera_is_on_tile_x = Math.floor(camera_x / this.map.tile_size)
        let camera_is_on_tile_y = Math.floor(camera_y / this.map.tile_size)
        
        let vx = Math.floor(drawing_context.gfx_width / this.map.tile_size) + 1
        let vy = Math.floor(drawing_context.gfx_height / this.map.tile_size) + 1

        //render background
        //this.ctx.clearRect(0, 0, this.canvas_width, this.canvas_height)

        let dc = drawing_context
        drawing_context.raw_ctx.fillStyle = "#162126"
        drawing_context.raw_ctx.fillRect(0, 0, dc.gfx_width, dc.gfx_height)
        drawing_context.raw_ctx.fillStyle = "#07A"
        drawing_context.raw_ctx.fillRect(0, py + 160, dc.gfx_width, 1000)

        //render map render the map render level render the level render:level renderLevel
        this.map.render(drawing_context, 
            px, py,
            camera_is_on_tile_x, camera_is_on_tile_y,
            camera_is_on_tile_x + vx, camera_is_on_tile_y + vy)

        //render entities

        let off = 0
        if (debug.test_entity_rendering_px) off = debug.test_entity_rendering_px
        
        for (let entity of this.entities) {
            //calculate distance of entity from mid-point of screen:
            let dx = Math.abs(camera_x + app.gfx_width / 2 - entity.x)
            let dy = Math.abs(camera_y + app.gfx_height / 2 - entity.y)

            let time_frozen = false

            if (player.has_time_freeze_bubble) {
                let a = Math.abs(entity.x - player.x)
                let b = Math.abs(entity.y - player.y)
                let c = a * a + b * b
                let dist = player.time_freeze_bubble_dist
                if (c > dist * dist) time_frozen = true
            }

            let modifiers = {
                time_frozen: time_frozen
            }

            if (dx + off <= this.app.gfx_width / 2 + general.render_tolerance_x
                &&
                dy + off <= this.app.gfx_height / 2 + general.render_tolerance_y) {
                    //drawing_context.raw_ctx.strokeStyle = "#0F0"
                    //drawing_context.raw_ctx.strokeText(dx +"/"+dy, entity.x + px, entity.y + py)
                    entity.render(elapsed, drawing_context, px, py, modifiers)
        
            }
        }

        this.map.render(drawing_context, //xyzzy
            px, py,
            camera_is_on_tile_x, camera_is_on_tile_y,
            camera_is_on_tile_x + vx, camera_is_on_tile_y + vy,
            {onlyOverlayTiles: true}
            )

    }



}


class Universe {
    constructor(app) {
        this.app = app
        this.ctx = app.ctx
        this.gfx_width = app.gfx_width
        this.gfx_height = app.gfx_height
        this.key_mapping = app.key_mapping
        this.planets = []
        this.msg = ""
       
        //stars
        for (let i = 0; i < 100; i++) {
            let type = rnd(0, 2)
            let x = rnd(- this.gfx_width / 2, this.gfx_width * 1.5)
            let y = rnd(- this.gfx_height / 2, this.gfx_height * 1.5)
            this.create_planet(x, y, type, "", false, true)
        }
        

        //this.create_planet(this.gfx_width / 2 - 140, 
          //  this.gfx_height / 2 - 160, 0, "sun", true)
                    
        this.create_planet(this.gfx_width / 2 + 320, 
            this.gfx_height / 2 + 100, 3, "earth")
                    
        this.create_planet(this.gfx_width / 2 - 180, 
            this.gfx_height / 2 + 140, 2, "mars")
            
        this.create_planet(this.gfx_width / 2 - 450, 
            this.gfx_height / 2 - 400, 1, "ice")
                

        /*let dist = 128

        let parts_x = Math.round(this.gfx_width / dist)
        let parts_y = Math.round(this.gfx_height / dist)
        let occupied = {}
        let nn = 200
        for (let i = 0; i < 10; i++) {
            let x
            let y
            let abort
            while (occupied[x + "/" + y]) {
                x = rnd (0, parts_x)
                y = rnd (0, parts_y)
                nn--
                if (nn <= 0) {
                    abort = true
                    break //all space or most space is full
                }
            }
            if (abort) break
            occupied[x + "/" + y] = true
            x = x * dist + rnd(-32, 32)
            y = y * dist + rnd(-32, 32)
            let img = rnd(1, 3)
            let type = "unknown"
            let sun = false
            this.create_planet(x, y, img, type, sun)
        }
        */

    }

    start() {
        this.ship = {
            x: this.gfx_width / 2,
            y: this.gfx_height / 2,
            speed: 3,
            frame: 0,
            angle: 0,
            rotation_speed: 0.1,
            width: 64,
            height: 64,
        }
        console.log(8887)
        let x = "music1"
        sound[x].volume = 0.5
        sound[x].loop = true
        sound[x].play()
    }

    end() {
        let x = "lever"
        sound[x].volume = 0.1
        sound[x].play()
        this.app.screen = "level"
        this.app.start_game()
    }

    enter_planet(planet) {
        console.log("ENTERING", planet, planet.type)
        this.end()
    }

    update(elapsed, key_bank) {
        let ship = this.ship
        ship.chosen_planet = false
        let k = key_bank.key_down

        if (k.up) {
            ship.frame = 2
            ship.x += Math.cos(ship.angle) * ship.speed
            ship.y += Math.sin(ship.angle) * ship.speed
        } else {
            ship.frame = 0
        }

        if (k.left) {
            this.ship.angle -= this.ship.rotation_speed
            ship.frame = 1
        } else if (k.right) {
            this.ship.angle += this.ship.rotation_speed
            ship.frame = 1
        }

        //planets
        for (let planet of this.planets) {
            planet.update(this.ship)
        }

        if (ship.chosen_planet) {
            //console.log(ship.chosen_planet)
            this.msg = "PRESS SPACE TO LAND"
        } else {
            this.msg = "USE WASD OR ARROW KEYS TO FLY TO A PLANET"
        }

        if (k.jump || k.shoot) {
            if (ship.chosen_planet) {
                this.enter_planet(ship.chosen_planet)
            }
        }
        

        if (ship.x >= this.gfx_width * 1.4) {
            ship.x -= ship.speed
        }

        if (ship.x <= -this.gfx_width * 0.6) {
            ship.x += ship.speed
        }

        if (ship.y >= this.gfx_height * 1.4) {
            ship.y -= ship.speed
        }

        if (ship.y <= -this.gfx_height * 0.6) {
            ship.y += ship.speed
        }
    }

    render() {
        let ship = this.ship
        let ctx = this.ctx

        //background color
        ctx.fillStyle = "#151515"
        ctx.fillRect(0, 0, this.gfx_width, this.gfx_height)

        let camera_x = ship.x - this.gfx_width / 2
        let camera_y = ship.y - this.gfx_height / 2

        if (camera_x >= this.gfx_width * 0.6) {
            camera_x = this.gfx_width * 0.6
        }

        if (camera_x <= -this.gfx_width * 0.6) {
            camera_x = -this.gfx_width * 0.6
        }

        if (camera_y >= this.gfx_height * 0.6) {
            camera_y = this.gfx_height * 0.6
        }

        if (camera_y <= -this.gfx_height * 0.6) {
            camera_y = -this.gfx_height * 0.6
        }

        //planets
        for (let planet of this.planets) {
            planet.render(ctx, this.app.image, - camera_x, - camera_y,
                ship.chosen_planet === planet)
        }
        
        //render ship
        let angle = this.ship.angle + (Math.PI * 0.5)
        let img = app.image["aship" + ship.frame]
        ctx.save()
        //ctx.translate(ship.x + ship.width / 2, ship.y + ship.height / 2)
        let px = ship.x + ship.width / 2 - camera_x
        let py = ship.y + ship.height / 2 - camera_y
        ctx.translate(px, py)
        ctx.rotate(angle)
        ctx.translate(-px, -py)
        ctx.drawImage(img, ship.x - camera_x, ship.y - camera_y)
        ctx.restore()

        this.ctx.fillStyle = "#fff"
        this.ctx.fillText(this.msg, this.gfx_width/2, this.gfx_height - 32)

    }

    create_planet(x, y, image = 0, type = "unknown", sun = false, star = false) {
        let pl = new Planet(x, y, image, type, sun, star)
        this.planets.push(pl)
    }
    
}



class Planet {
    constructor(x, y, image = 0, type = "unknown", sun = false, star = false) {
        this.x = x
        this.y = y
        this.image = image
        this.type = type
        this.sun = sun
        this.star = star
        this.render_on = true
        let r = rnd(1, 100)
        if (r <= 30) {
            this.blink = true
            this.reset_count(this.render_on)
        } else {
            this.blink = false
        }
        
    }

    update(ship) {
        if (this.star && this.blink) {
            this.count --
            if (this.count <= 0) {
                this.render_on = !this.render_on
                this.reset_count(this.render_on)
            }
        }

        if (!this.star && !this.sun) {
            let dx = Math.abs(ship.x - this.x)
            let dy = Math.abs(ship.y - this.y)
            if (dx <= 120 && dy <= 120) {
                ship.chosen_planet = this
            }
        }
    }

    reset_count(on) {
        if (on) {
            this.count = rnd(100, 200)
        } else {
            this.count = 25
        }
    }

    render(ctx, image, offx, offy, is_chosen) {
        let frame = this.image
        if (!this.render_on) {
            frame = 1
            if (this.image === 1) frame = 0
        }
        let img = "planet" + frame
        if (this.sun) img = "sun"
        if (this.star) img = "star" + frame
        ctx.drawImage(image[img], this.x + offx, this.y + offy)
        if (is_chosen) {
            ctx.drawImage(image["planet_chooser"], this.x + offx, this.y + offy)
        }
    }
}

class App {
    constructor(data) {

        this.log_stats = debug.log_stats
        this.log_stats_interval = debug.log_stats_interval

        this.update_rate = GAME_UPDATE_RATE
        this.gfx_width = 640
        this.gfx_height = 480
        this.fps_counter_count = 0
        this.fps_counter_bank = 0
        this.key_mapping = {
            ArrowLeft: "left",
            ArrowRight: "right",
            ArrowUp: "up",
            ArrowDown: "down",
            w: "up",
            a: "left",
            s: "down",
            d: "right",
            k: "jump",
            " ": "jump",
            y: "jump",
            x: "shoot",        
        }

        this.key_bank = {
            key_down: {},
            key_just_released: {},
            key_just_pressed_down: {},
        }

        this.level_generator = new LevelGenerator(data.level_templates)

        let canvas = document.createElement('canvas')
        canvas.width = this.gfx_width
        canvas.height = this.gfx_height

        this.canvas_width = canvas.width
        this.canvas_height = canvas.height
        
        document.body.append(canvas)

        /*
        let say_box = document.createElement('div')
        say_box.id = "say-box"
        say_box.innerHTML = ""
        document.body.append(say_box)
*/


        this.ctx = canvas.getContext("2d")
        
        this.ctx.webkitImageSmoothingEnabled = false                                                                              
        this.ctx.mozImageSmoothingEnabled = false                                                                                 
        this.ctx.imageSmoothingEnabled = false
        this.ctx.fillStyle = "#07A"

        this.init_images()
        this.init_audio()

        let main_loop = new MainLoop(this.update_rate,
            this.update.bind(this),
            this.render.bind(this))


        this.init_input()

        this.universe = new Universe(this)

        //this.start_universe()

        if (debug.quick_start) {
            this.start_game()
        } else {
            this.open_pre_screen()
        }

        window.onblur = () => {
            /* prevent bug where if page loses focus,
            a button is considered as still pressed (and
            player keeps running without a button being pressed,
            for example):*/

            if (!this.player) return

            this.key_bank.key_down = {}
            this.player.stop_walking()
        }
    
    }


    open_pre_screen() {
        function dodo() {
            c++
            if (c === txt.length) {
                that.open_title_screen()
            } else {
                that.ctx.fillText(txt[c], 0, 20 + c * 16)
                setTimeout(dodo, one_of([20, 20, 20, 20]))
            }
        }
        let that = this
        let txt = [
            "5DX version 2.4",
            "VM 5DX by Anselm Kuhn: www.geocities.com/kuhnland",
            "5.3.13-302.fc31.x86_16",
            "Loading Game File",
            "chref check bin 283929.000032.344562",
            "failed to fetch symbol.dll - continuing",
            "failed to fetch win32.dll - continuing",
            "failed to fetch com.dll - continuing",
            "failed to fetch attach.dll - continuing",
            "Virtual C:\\ drive initialized",
            "Starting session c1 in userspace C:\\",
            "Loading game data .....",
            "All clear!",
        ]
        this.ctx.font = "monospace"
        this.screen = "pre"
        this.ctx.fillStyle = "#0F0"
        
        let c = -1
        dodo()

        //this.ctx.textAlign = "center"
        //this.ctx.textBaseline = 'middle'
    }

    open_title_screen() {
        this.screen = "title"
        this.title_y = 0
        this.title_dir = -1
        this.title_blink = 0
        this.title_frame = 0
        this.title_loading = 1
        this.title_stars = []
        for (let i = 0; i < 80; i++) {
            this.title_stars.push(
                {
                    x: rnd(0, this.gfx_width),
                    y: rnd(0, this.gfx_height),  
                    speed: rnd(1, 5), 
                }
            )
        }
        this.title_stars = this.title_stars.sort( (a, b) => a.speed - b.speed)
        let on_cl = (e) => {
            if (e.key !== " ") return
            this.close_title_screen()
            document.removeEventListener( "keydown", on_cl )
        }

        document.addEventListener ( "keydown", on_cl )

    }

    start_universe() {
        this.screen = "universe"
        this.universe.start()
    }

    close_title_screen() {
        this.start_universe()
    }

    render_title_screen() {
        this.ctx.fillStyle = "#151515"
        this.ctx.fillRect(0, 0, this.gfx_width, this.gfx_height)

        for (let i = 0; i < this.title_stars.length; i++) {
            let star = this.title_stars[i]
            let frame = 0
            if (star.speed <= 3) frame = 1
            if (star.speed <= 2) frame = 2
            this.ctx.drawImage(this.image["star"+frame], star.x, star.y)
        }

        this.ctx.drawImage(this.image["title"+(this.title_frame+1)], -8,
            this.title_y)
        if (this.title_loading) {
            this.ctx.drawImage(this.image.titleloading, 0,
                320)
        }

        this.ctx.drawImage(this.image["studio-title"], -8,
            430)


    }

    update_title_screen() {
        this.title_y += this.title_dir
        if(this.title_y <= -100) {
            this.title_dir = 1
            this.title_frame = 1 - this.title_frame
        }
        if(this.title_y >= 10) {
            this.title_dir = -1
            this.title_frame = 1 - this.title_frame
        }
        this.title_blink ++
        if (this.title_blink >= 40) {
            this.title_blink = 0
            this.title_loading = 1 - this.title_loading
        }
        for (let i = 0; i < this.title_stars.length; i++) {
            let star = this.title_stars[i]
            star.x -= star.speed
            if (star.x <= -32) star.x = this.gfx_width + 32
        }

    }

    update (elapsed) {
        if (this.screen === "pre") {
            return
        }

        if (this.screen === "title") {
            this.update_title_screen()
            return
        }

        if (this.screen === "universe") {
            this.universe.update(elapsed, this.key_bank)
        }

        if (this.screen === "level") {
            if (this.log_stats) this.do_log_stats()
            this.current_level.update(elapsed, this.key_bank,
                this.player)
        }

        //note: keydown is not flushed. it is flushed
        //once keyup event is triggered.
        //that way we circumvent the annoying
        //bug where there is a delay between the first and
        //the second keydown event when you press down the key
        this.key_bank.key_just_released = {}
        this.key_bank.key_just_pressed_down = {}
    }

    start_game() {
        this.screen = "level"

        this.current_level = new Level(this.level_generator, this)

        /*  
        this.test2 = this.current_level.create_entity(Ladder)
        this.test2.x = 300
        this.test2.y = 420
        */

        this.player = this.current_level.create_entity(Player)

        this.player.y = 800

        let gogo = -1

        if (debug.create_extra_entities) gogo = debug.create_extra_entities

        //this.test2 = this.current_level.create_entity(BulletLike)
        //this.test2.x = 60
        //this.test2.y = 1050

        
        /*
        this.test2 = this.current_level.create_entity(Rock)
        this.test2.x = 300
        this.test2.y = 800

        this.test2 = this.current_level.create_entity(Rock)
        this.test2.x = 330
        this.test2.y = 500

        this.test2 = this.current_level.create_entity(Rock)
        this.test2.x = 360
        this.test2.y = 1000

        this.test2 = this.current_level.create_entity(Rock)
        this.test2.x = 280
        this.test2.y = 700

        this.test2 = this.current_level.create_entity(Rock)
        this.test2.x = 390
        this.test2.y = 400
        */




        for (let i = 0; i < gogo; i++) {

            this.test2 = this.current_level.create_entity(Kudo)
            this.test2.x = 300
            this.test2.y = 500

            this.test2 = this.current_level.create_entity(Bloogie)
            this.test2.x = 220
            this.test2.y = 500

            this.test2 = this.current_level.create_entity(Bloogie)
            this.test2.x = 220
            this.test2.y = 500

            this.test2 = this.current_level.create_entity(SpikeBall)
            this.test2.x = 300
            this.test2.y = 500

            this.test2 = this.current_level.create_entity(Sinner)
            this.test2.x = 300
            this.test2.y = 500

            this.test2 = this.current_level.create_entity(Pumpkin)
            this.test2.x = 300
            this.test2.y = 500

            this.test2 = this.current_level.create_entity(Killa)
            this.test2.x = 300
            this.test2.y = 500

            this.test2 = this.current_level.create_entity(Infector)
            this.test2.x = 300
            this.test2.y = 500

            this.test2 = this.current_level.create_entity(Marata)
            this.test2.x = 300
            this.test2.y = 500

            this.test2 = this.current_level.create_entity(Coin)
            this.test2.x = 300
            this.test2.y = 500

        }


    }


    init_input() {
        //this should be generic, not tailored to player.
        //it can be used by the universe map and other things, too
        document.addEventListener('keydown', (e) => {
            //console.log("KEY EVENT", e)

            //chrome messes up the event handler when god mode is enabled
            //but only sometimes or .... what is this? sometimes
            //letter keys do not fire, but other key do. wtf?
            if (e.key === "g") {
                debug.god_mode = !debug.god_mode
                console.log("GOD MODE:", debug.god_mode)
            }
            if (e.key === "c") debug.show_collision_boxes = !debug.show_collision_boxes

            let action = this.key_mapping[e.key]
            if (!action) return
            if (!this.key_bank.key_down[action]) {
                this.key_bank.key_just_pressed_down[action] = true
            }
            this.key_bank.key_down[action] = true
        })

        document.addEventListener('keyup', (e) => {
            let action = this.key_mapping[e.key]
            if (!action) return
            this.key_bank.key_down[action] = false
            this.key_bank.key_just_released[action] = true
        })
    }

    do_log_stats() {
        let time = performance.now()
        let diff = time - this.fps_counter
        if (diff) this.fps_counter_bank += diff
        let limit = this.log_stats_interval
        if (this.fps_counter_bank > limit) {
            //console.clear()
            this.fps_counter_bank -= limit
            let fps = this.fps_counter_count / limit * 1000
            console.log("FPS:", fps, "ENTITY AMOUNT:",
                app.current_level.entities.length)
            this.fps_counter_count = 0
        }
        this.fps_counter_count++
        this.fps_counter = time
    }




    render (elapsed) {
        if (this.screen === "pre") {
            return
        }

        if (this.screen === "title") {
            this.render_title_screen()
            return
        }

        if (this.screen === "universe") {
            this.universe.render()
            return
        }
        
        let drawing_context = {
            draw_image: this.draw_image.bind(this),
            gfx_width: this.gfx_width,
            gfx_height: this.gfx_height,
            raw_ctx: this.ctx, //preferably use raw_ctx only for drawing
                //rects for testing and debugging, interface
                //with draw_image for real stuff, it's cleaner that way
        }
        this.current_level.render(elapsed, drawing_context, this.player)
    }


    init_images() {
        this.image = {}
        let all_images = document.getElementsByTagName('img')
        for (let i = 0; i < all_images.length; i++) {
            let src = all_images[i].src
            let lst = src.replaceAll("\\", "/").split("/")
            let name = lst[lst.length - 1].replace(".png", "")
            if (all_images[i].id) name = all_images[i].id
            this.image[name] = all_images[i]
        }
    }


    init_audio() {
        this.audio = {}
        let all = document.getElementsByTagName('audio')
        for (let i = 0; i < all.length; i++) {
            let src = all[i].src
            let lst = src.replaceAll("\\", "/").split("/")
            let name = lst[lst.length - 1]
                .replace(".wav", "")
                .replace(".mp3", "")
            if (all[i].id) name = all[i].id
            this.audio[name] = all[i]
        } 
        window.sound = this.audio //set as global
    }
    
    draw_image(img_name, x, y) {
        //console.log(img_name, this.image[img_name], this.image)
        //console.log(this.image[img_name])
        if (!this.image[img_name]) {
            return
            //throw `Image with name '${img_name}' does not exist'`
        }
        this.ctx.drawImage(this.image[img_name], x, y)
    }


}


window.onerror = () => {
    //stop main loop on first error; in order to not clog up console
    //with pointless error messages and stuff:
    window.GLOBAL_ERROR_TRIGGERED = true
}


window.onload = () => {
    let data = {
        level_templates: window.level_templates, //from level-templates.js
    }

    app = new App(data)
}



