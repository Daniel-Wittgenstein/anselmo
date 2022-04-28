
//okay

class Grid {
    //two-dimensional-array. this handles looping / reading / writing
    //this way it prevents x/y errors by providing
    //an interface and we don't have to write the same loops over and over again
    constructor(x, y, init = 0) {
        this.width = x
        this.height = y
        this.array = []
        for (let x = 0; x < this.width; x++) {
            this.array[x] = []
            for (let y = 0; y < this.height; y++) {
                this.array[x][y] = init
            }
        }
    }

    to_string(separator = "\n", func = n => n) {
        //grid to string: mostly for testing, but could have other uses, too
        //to convert a string to a grid, use the static method
        //Grid.get_grid_from_string
        let str = ""
        let last_y
        this.loop( (that, x, y, value) => {
            if (y !== last_y) {
                str += separator
            }
            str += func(value)
            last_y = y
        })
        return str.trim()
    }

    loop(func, start_x = 0, start_y = 0, end_x = -666, end_y = -666) {
        if (end_x === -666) end_x = this.width
        if (end_y === -666) end_y = this.height
        
        if (end_x > this.width) end_x = this.width
        if (end_y > this.height) end_x = this.height

        if (start_x < 0) start_x = 0
        if (start_y < 0) start_y = 0

        for (let y = start_y; y < end_y; y++) {
            for (let x = start_x; x < end_x; x++) {
                let value = this.array[x][y]
                func(this, x, y, value)
            }
        }
    }

    circle_loop(func, mid_x = 0, mid_y = 0, cubic_radius = 9,
        func_other = () => {},
        start_x = 0, start_y = 0, end_x = -666, end_y = -666) {
        /* 
        - the radius is expressed in tiles, but it can be a float.
        it is cubed though, i.e. pass 9 if you want 3!

        - func_other is optional: gets called for all
        tiles outside the circle (but not outside grid!)

        - func (and func_other) gets passed: 1. x, 2. y, 3. tile_value
            if circle is only partially inside grid, the part
            outside the grid is simply ignored (does not throw error)
        */
        let func2 = (_, x, y, value) => {
            let a = x - mid_x
            let b = y - mid_y
            let c_squared = a * a + b * b
            let do_this
            if (c_squared <= cubic_radius) {
                do_this = func
            } else {
                do_this = func_other
            }
            do_this(x, y, value)
        }
        this.loop(func2, start_x = 0, start_y = 0, end_x = -666, end_y = -666)
    }

    get(x, y, outside_x = undefined, outside_y = undefined) {
        if (this.array[x] === undefined) return outside_x
        if (this.array[x][y] === undefined) return outside_y
        return this.array[x][y]
    }

    is_inside(x, y) {
        const obj = {}
        let r = this.get(x, y, obj, obj)
        if (r === obj) return false
        return true
    }

    set(x, y, value, outside_x = undefined, outside_y = undefined) {
        //override = true should only be passed by the constructor
        if (this.array[x] === undefined) return outside_x
        if (this.array[x][y] === undefined) return outside_y
        this.array[x][y] = value
        return true
    }

    get_width() {
        return this.width
    }

    get_height() {
        return this.height
    }

}

Grid.get_grid_from_string = (str, func) => {
    //static method: function: takes the character and
    //returns the value that should be put into the grid
    let list = str.split("\n").map(n => n.trim()).filter(n => n)
    width = list[0].length
    height = list.length
    grid = new Grid(width, height, 0)
    grid.loop ( (that, x, y, value) => {
        let v = list[y].substr(x, 1)
        let d = func(v)
        let r = grid.set(x, y, d, false, false)
    })
    return grid
}

Grid.join_grids = (grid1, grid2, mode) => {
    //joins two grids, returns new grid, leaves
    //original grids untouched
    //mode: "horizontal" for horizontal, "vertical" for vertical
    //what this means: for horizontal the two grids
    //have to have the same height: it's like attaching the
    //second grid to the right of the first one.
    //for vertical, the two grids must have the same width,
    //it's like attaching the second one at the bottom.
    let w
    let h
    if (mode === "horizontal") {
        if ( grid1.get_height() !== grid2.get_height() ) {
            throw `join grids horizontally: must have same height`
        }
        w = grid1.get_width() + grid2.get_width()
        h = grid1.get_height() 

        let nu = new Grid(w, h)
        grid1.loop( (that, x, y, value) => {
            nu.set(x, y, value)
        })

        grid2.loop( (that, x, y, value) => {
            nu.set(x + grid1.get_width(), y, value)
        })

        return nu

    } else {
        if ( grid1.get_width() !== grid2.get_width() ) {
            throw `join grids vertically: must have same width`
        }
        w = grid1.get_width()
        h = grid1.get_height() + grid2.get_height()

        let nu = new Grid(w, h)
        grid1.loop( (that, x, y, value) => {
            nu.set(x, y, value)
        })

        grid2.loop( (that, x, y, value) => {
            nu.set(x, y + grid1.get_height(), value)
        })

        return nu


    }
}

/*
TESTING:
let str = `
0123456789
1111222323
2399329333
`

let str2 = `
abcdefghfg
bbbbbbbbfg
ccccccccfg
`

let a = Grid.get_grid_from_string(str, n => n )

let b = Grid.get_grid_from_string(str2, n => n )

let c = Grid.join_grids(a, b, "horizonta")

let d = c.to_string()

console.log(a, b, c, d)

*/