
    generate(info) {
        /*
        This can call info.create_entity
        */
        function get_row(level_templates, width, yy) {
            //width: integer: how many template blocks
            let templ = one_of(level_templates)
            let grid = templ.grid
            for (let x = 0; x < width; x++) {
                let section = "mid"
                if (yy === 0) section = "air"
                if (yy >= 2) section = "underground"
                let subset = level_templates.filter( l => l.section === section)
                if (!subset.length) {
                    throw `There are no level templates with section '${section}'.
                    Cannot build level.`
                }
                let templ = one_of(subset)
                console.log(x, yy, templ)
                let grid2 = templ.grid
                grid = Grid.join_grids(grid, grid2, "horizontal")
            }
            console.log(grid.to_string("\n", (n) => Number(n) + 1 ))
            return grid
        }


        let grid = get_row(this.level_templates, 4, 0)        
        for (let y = 0; y < 3; y++) {
            let grid2 = get_row(this.level_templates, 4, y + 1)
            grid = Grid.join_grids(grid, grid2, "vertical")
        }

        console.log(grid)

        info.level.map = GameMap.game_map_from_grid(grid,
            info.tile_size, info.tile_image)


        info.level.map.loop ( (that, x, y, value) => {
            //build border around level:
            if ( x <= 1 || x >= info.level.map.get_width() - 2 
            || y <= 1 || y >= info.level.map.get_height() - 2
            ) {
                info.level.map.set(x, y, 1)

                return
            }

            //set entity:
            if ( this.is_class(value) ) {
                info.level.map.set(x, y, -1) //empty tile
                let entity = info.create_entity(value)
                let mult = info.level.map.tile_size
                entity.x = x * mult
                entity.y = y * mult - 20
            }
        })




