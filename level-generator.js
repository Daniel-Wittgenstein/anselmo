




class LevelGenerator {
    constructor(level_templates) {
        this.level_templates = level_templates
        let that = this
        level_templates.forEach((t) => {
            let lookup_table = t.lookup_table
            if (!lookup_table) throw `Level template has no lookup_table.`
            let grid = Grid.get_grid_from_string(t.content,
                (char) => that.chars_to_map_data(char, lookup_table)
                )
            t.grid = grid
            t.content = false
        })
        //console.log(this.level_templates)
    }

    chars_to_map_data(char, lookup_table) {
        let x = lookup_table[char]
        //check if object, in that case entity / tile etc.
        if (!x && x != 0) throw `character '${char}' has no lookup_table mapping`
        return x
    }

    hook_up_levers_and_bridges(info) {
        let entities = info.get_entities()
        let levers = entities.filter(n => n.is_lever)
        let bridges = entities.filter(n => n.is_bridge)

        levers = shuffle(levers)
        bridges = shuffle(bridges)
        

        console.log(levers, bridges)
        let bigger = levers.length
        if (bridges.length > bigger) bigger = bridges.length
        for (let i = 0; i < bigger; i++) {
            let lever = levers[i]
            let bridge = bridges[i]
            if (!bridge) {
                lever.points_to_bridge = "useless_lever"  
            } else if (!lever) {
                bridge.switch(info.level.map) //bridge is enabled by default
            } else {
                lever.points_to_bridge = bridge
            }
        }
    }


    run_checks() {
        return
        //checks level templates for errors
        for (let t of this.level_templates) {
            console.log(t.section, t.grid.get_width(), t.grid.get_height())
        }
    }

    generate(info) {
        /*
        This can call info.create_entity
        */
        function get_row(level_templates, width, yy, blaupause) {
            //width: integer: how many template blocks
            let section = "mid"

                //section = "baumtest" //testing only!!!! xyzzy todo to do remove
                //section = "doodletest" //testing only!!!! xyzzy todo to do remove

            if (yy === 0) section = "air"

                  //if (yy === 0) section = "airtest" //testing only!
            
            if (yy >= 2) section = "underground"
            let subset = level_templates.filter( l => l.section === section)
            if (!subset.length) {
                throw `There are no level templates with section '${section}'.
                Cannot build level.`
            }

            let templ = one_of(subset)
            let grid = templ.grid
            for (let x = 0; x < width; x++) {
                let tmp_subset = subset
                let requested_property

//                console.log(x, yy, blaupause[yy][x])

                if ( blaupause[yy][x] && blaupause[yy][x].startsWith("down") ) {
                    requested_property = "bottom_open"
                    tmp_subset = subset.filter(n => n.bottom_open)
                } else if ( blaupause[yy][x] && blaupause[yy][x].startsWith("up") ) {
                    requested_property = "top_open"
                    tmp_subset = subset.filter(n => n.top_open)
                }
                if (!tmp_subset.length) {
                    throw `I found no templates with section: '${section}'
                    and property: '${requested_property}'. Cannot build level.`
                }
                let templ = one_of(tmp_subset)
                let grid2 = templ.grid
                grid = Grid.join_grids(grid, grid2, "horizontal")
            }
            //console.log(grid.to_string("\n", (n) => Number(n) + 1 ))
            return grid
        }
        
        this.run_checks()
        
        let blaupause = []

        blaupause[0] = ["    ", "    ", "    ", "    "]
        blaupause[1] = ["    ", "    ", "    ", "    "]
        blaupause[2] = ["    ", "    ", "    ", "    "]
        blaupause[3] = ["    ", "    ", "    ", "    "]
        blaupause[4] = ["    ", "    ", "    ", "    "]

        let last_dropdown = -1

        for (let y = 1; y < 4; y++) { //loop from 1 to 3
            let x
            do {
                x = rnd(0, 3)
            } while (x === last_dropdown)
            //x becomes dropdown, so in the next line,
            //we need an up template:
            blaupause[y][x] = "down" + x
            blaupause[y + 1][x] = "up  " +x
            last_dropdown = x
        }

        //now we need to convert the blaupause to sth. actually meaningful:
        let grid

        if (debug.test_template) {
            let templ = this.level_templates.filter ( n => debug.test_template === n.name )
            if (!templ || !templ.length) {
                throw `debug.test_template has value '${debug.test_template}',
                    but there is no template with this name`
            }            
            grid = templ[0].grid
            for (let i = 0; i < 2; i++) { //3 here means: generate 2 to the power
                //of 3 (=8) identical templates
                let grid2 = grid
                grid = Grid.join_grids(grid, grid2, "vertical")
            }

        } else {
            grid = get_row(this.level_templates, 4, 0, blaupause)   

            for (let y = 0; y < 4; y++) {
                let grid2 = get_row(this.level_templates, 4, y + 1, blaupause)
                grid = Grid.join_grids(grid, grid2, "vertical")
            }
        }

        let spacer = new Grid( grid.get_width(), 13, 0)

        grid = Grid.join_grids(grid, spacer, "vertical")

        info.level.map = GameMap.game_map_from_grid(grid,
            info.tile_size, info.tile_image, info.level)

            info.level.map.loop ( (that, x, y, value) => {
            let position_entity = function(entity, x, y) {
                let mult = info.level.map.tile_size
                entity.x = x * mult
                entity.y = y * mult - 20
            }

            //build border around level: (yes, this is correct here)
            if ( x <= 1 || x >= info.level.map.get_width() - 2 
            || y <= 1 || y >= info.level.map.get_height() - 2
            ) {
                info.level.map.set(x, y, 1)
                return
            }

            //set entity:
            if ( typeof value === 'object' ) {
                let entityToCreate
                let tileToCreate = -1
                if (value.put2) {
                    entityToCreate = value.entity
                    tileToCreate = value.tile
                } else {
                    entityToCreate = value
                    tileToCreate = -1
                }
                //entity:
                info.level.map.set(x, y, tileToCreate) //empty tile
                let entity = info.create_entity(entityToCreate, x, y, info.level.map)
                position_entity(entity, x, y)
            } else if (typeof value === 'function') { //if it's actually a function.
                let res = value(x, y, info)
                if (typeof res === "function" ) { //if function returns a class:
                        //classes have also typeof === "function". JS is crazy, isn't it?
                    info.level.map.set(x, y, -1) //empty tile
                    let entity = info.create_entity(res, x, y, info.level.map)
                    position_entity(entity, x, y)
                } else {
                    //no class returned. return value is treated a tile value.
                    info.level.map.set(x, y, res)
                }

            } //otherwise leave tile as it is
        })

        this.hook_up_levers_and_bridges(info)

    }

    is_class(t) {
        /* This includes false positives, obviously, but
        it works for this specific case, because we don't stick
        functions into window.legend (see: level-templates-lookup-tables.js)
        */
        return typeof t === 'function'
    }

}