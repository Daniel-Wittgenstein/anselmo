

/* 



########## tile_collision_table; #########

key: tile value (number or string)

value: true or false (or 0 or 1 if you prefer):
collides, does not collide

-1 is currently the empty tile, so it should return false for sure

default is falsey, as you can guess

######### LEGEND: #########

key:

    character inside string

value:
a.) string or number: becomes the tile value

b.) function: function must return either:
    1.) tile value -> this tile is set at position
        or
    2.) EntityClass -> this entity is set at the position, and tile
        is set to -1 (empty)


example:
        ".": -1,
        0: 0,
        1: 1,
        2: (x, y, info) => {return 2},
        3: {put: Bloogie},
        "#": {put: Ladder},

*/


//tile value
/*
not used atm. -1 is only non-colliding
would require some code changes.
window.tile_collision_table = {
    "-1": false,
    0: false,
    1: true,
    2: true,
    3: true,
    4: true,
}


currently you are restricted to one lever/bridge
per level template!!!


*/


window.legend = 
{

    _tmp: {

    },

    normal: {
        ".": -1,
        "B": () => maybe(50, 0, -1), //maybe foliage, maybe not
        "W": () => maybe(50, 2, 1), //maybe grass on ground, maybe not
        "x": () => maybe(50, Coin, -1),
        "'": () => maybe(70, Ladder, -1),
        "k": () => maybe(30, Killa, -1),
        "p": () => maybe(50, Pumpkin, -1),
        "P": () => maybe(90, Pumpkin, -1),
        "m": () => maybe(70, Marata, -1),
        "M": () => maybe(100, Marata, -1),
        "e": () => maybe(70, Bloogie, -1),
        "s": () => maybe(70, Sinner, -1),
        "i": () => maybe(70, Infector, -1),
        "b": () => maybe(50, SpikeBall, -1),
        "&": () => maybe(50, Kudo, -1),

        "+": () => TechLever,
        "%": () => TechBridge,
        "*": () => TechBridgeClosed,
        

        0: 0, //foliage
        1: 1, //tree / brown ground
        2: 2, //brown ground with grass
        3: 3, //infected ground
        4: 4, //infected ground 2
        5: 5,
        6: 6,
        7: 7,
        8: 8,
        9: 9,
        "#": () => Ladder,
        "??": () => Rock,
    }
}


